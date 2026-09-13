Pod::Spec.new do |s|
  s.name         = "ZXFaceDetector"
  s.version      = "1.0.0"
  s.summary      = "Face detection backed by Apple's Vision framework."
  s.description  = <<-DESC
    Wraps VNDetectFaceLandmarksRequest so the app can detect faces using the
    detector built into iOS, rather than shipping a third-party one.
  DESC
  s.homepage     = "https://zaltrix.local"
  s.license      = { :type => "Proprietary" }
  s.author       = { "Zaltrix" => "dev@zaltrix.local" }
  s.platform     = :ios, "15.5"
  s.source       = { :path => "." }
  s.source_files = "*.{swift,h,m}"
  s.frameworks   = "Vision", "CoreImage", "UIKit"
  s.dependency "React-Core"
  s.swift_version = "5.0"
end
