#import <React/RCTBridgeModule.h>

/**
 * Exposes the Swift Vision detector to JavaScript.
 *
 * A classic bridge module rather than a Nitro/Turbo spec: detection runs a few
 * times per capture, not per frame, so the simpler surface is worth more here
 * than the extra throughput codegen would buy.
 */
@interface RCT_EXTERN_MODULE (ZXFaceDetector, NSObject)

RCT_EXTERN_METHOD(detectFaces
                  : (NSString *)uri resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
