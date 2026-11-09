# U²-Net small / U2NETP

U²-Net: Going Deeper with Nested U-Structure for Salient Object Detection (2020).
Authors: Xuebin Qin, Zichen Zhang, Chenyang Huang, Masood Dehghan, Osmar R. Zaiane, Martin Jagersand.

Upstream model/code: https://github.com/xuebinqin/U-2-Net (Apache-2.0; see U2NET-LICENSE.txt).
ONNX conversion/distribution: https://github.com/danielgatis/rembg (MIT; see REMBG-LICENSE.txt).
Exact download: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
Upstream rembg checksum: MD5 8e83ca70e441ab06c318d82300c84806.
Verified SHA-256: 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8.
File size: 4,574,861 bytes. Unmodified ONNX weights. No training or fine-tuning by MyStyle.

Inference uses ONNX Runtime Web 1.30.0 (MIT), https://github.com/microsoft/onnxruntime.
The runtime and original license are included in the application distribution.

This is general salient-object segmentation, not a specialized clothing classifier.
Model quality on a real iPhone or a representative private clothing collection has not been measured.
Photos are processed locally; model and runtime files are served by the same site as MyStyle.
