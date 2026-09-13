# Face embedding model

`mobile_face_net.tflite` turns a cropped 112x112 face into a 192-dimension
embedding. Two embeddings of the same person land close together in cosine
distance; two different people land far apart. Nothing leaves the device.

## Provenance

| | |
|---|---|
| Architecture | MobileFaceNet (sirius-ai TensorFlow implementation) |
| Source | https://github.com/estebanuri/face_recognition — `android/app/src/main/assets/mobile_face_net.tflite` |
| Retrieved | 2026-09-13 |
| Size | 5,243,108 bytes |
| SHA-256 | `b67366e085ec9f6c2afb05c10397a46edeb823367abaec77f64f5ce946ac2847` |
| Input | `[1, 112, 112, 3]` float32, normalised `(px - 127.5) / 128` |
| Output | `[1, 192]` float32 embedding (L2-normalised before comparison) |

## ⚠️ Licence status: UNRESOLVED — not cleared for production

**The source repository ships no licence file**, so redistribution of these
weights is not granted in writing. MobileFaceNet architectures of this lineage
are also commonly trained on face datasets with their own restrictions (for
example MS-Celeb-1M, which was withdrawn by Microsoft).

Before shipping this app to users, replace this file with a model whose licence
and training data you have cleared. The swap is one file: keep the same filename
and tensor contract above and nothing else changes. If the new model emits a
different embedding width, `src/services/faceRecognition.ts` reads the shape
from the model at load time and adapts — but **every already-enrolled face must
be re-enrolled**, because embeddings from different models are not comparable.
