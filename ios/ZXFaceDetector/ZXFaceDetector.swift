import CoreImage
import Foundation
import React
import UIKit
import Vision

/**
 Face detection using the Vision framework built into iOS.

 Replaces a third-party detector so the app relies on the detector Apple tunes
 for iPhone cameras. Vision copes far better with dim indoor light, adds no
 binary weight, ships no telemetry, and — unlike ML Kit — has a Simulator slice
 for Apple Silicon.

 The JS side hands over a file URL for a still whose orientation has already
 been baked into the pixels (see useFaceCapture's capture()), so this reads the
 pixels as-is. That guarantee matters: .cgImage below drops any EXIF flag, so a
 still that merely carried one would be measured sideways.
 */
@objc(ZXFaceDetector)
class ZXFaceDetector: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Vision reports angles in radians; the rest of the app works in degrees.
  private func degrees(_ radians: NSNumber?) -> Double {
    guard let radians = radians else { return 0 }
    return radians.doubleValue * 180.0 / .pi
  }

  /**
   Openness of one eye, approximated from its landmark outline.

   Vision has no equivalent of ML Kit's eye-open probability, but the ratio of
   an eye outline's height to its width collapses when the lid closes. Returns
   nil when landmarks are unavailable so callers can tell "unknown" from "shut".
   */
  private func eyeOpenness(_ eye: VNFaceLandmarkRegion2D?) -> NSNumber? {
    guard let points = eye?.normalizedPoints, points.count >= 4 else { return nil }

    var minX = Double.greatestFiniteMagnitude
    var maxX = -Double.greatestFiniteMagnitude
    var minY = Double.greatestFiniteMagnitude
    var maxY = -Double.greatestFiniteMagnitude

    for point in points {
      minX = min(minX, Double(point.x))
      maxX = max(maxX, Double(point.x))
      minY = min(minY, Double(point.y))
      maxY = max(maxY, Double(point.y))
    }

    let width = maxX - minX
    let height = maxY - minY
    guard width > 0 else { return nil }

    // An open eye sits near 0.35-0.5; a closed one collapses toward 0.1.
    let ratio = height / width
    let openness = min(1.0, max(0.0, (ratio - 0.10) / 0.25))
    return NSNumber(value: openness)
  }

  private func loadImage(from uri: String) -> CGImage? {
    var path = uri
    if let url = URL(string: uri), url.isFileURL {
      path = url.path
    } else if uri.hasPrefix("file://") {
      path = String(uri.dropFirst("file://".count))
    }

    guard let image = UIImage(contentsOfFile: path) else { return nil }
    return image.cgImage
  }

  /**
   Detects every face in the image at `uri`.

   Resolves an array of plain dictionaries mirroring the shape the app already
   uses, so the JS side is detector-agnostic.
   */
  @objc(detectFaces:resolver:rejecter:)
  func detectFaces(
    _ uri: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let cgImage = loadImage(from: uri) else {
      reject("image_unreadable", "Could not read an image at \(uri)", nil)
      return
    }

    let width = Double(cgImage.width)
    let height = Double(cgImage.height)

    let request = VNDetectFaceLandmarksRequest()
    // .up is correct rather than merely assumed: the caller redraws every still
    // upright before saving it, so there is no orientation flag left to apply.
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])

    do {
      try handler.perform([request])
    } catch {
      reject("detection_failed", "Vision failed: \(error.localizedDescription)", error)
      return
    }

    let observations = request.results ?? []
    var faces: [[String: Any]] = []

    for face in observations {
      // Vision's boundingBox is normalised with the origin at the bottom-left;
      // everything downstream expects pixels from the top-left.
      let box = face.boundingBox
      let x = Double(box.origin.x) * width
      let boxWidth = Double(box.size.width) * width
      let boxHeight = Double(box.size.height) * height
      let y = (1.0 - Double(box.origin.y) - Double(box.size.height)) * height

      var entry: [String: Any] = [
        "x": x,
        "y": y,
        "width": boxWidth,
        "height": boxHeight,
        "frameWidth": width,
        "frameHeight": height,
        "yawAngle": degrees(face.yaw),
        "rollAngle": degrees(face.roll),
      ]

      // Pitch arrived in iOS 15; treat it as level when unavailable.
      if #available(iOS 15.0, *) {
        entry["pitchAngle"] = degrees(face.pitch)
      } else {
        entry["pitchAngle"] = 0
      }

      if let landmarks = face.landmarks {
        if let left = eyeOpenness(landmarks.leftEye) {
          entry["leftEyeOpenProbability"] = left
        }
        if let right = eyeOpenness(landmarks.rightEye) {
          entry["rightEyeOpenProbability"] = right
        }
      }

      faces.append(entry)
    }

    resolve(faces)
  }
}
