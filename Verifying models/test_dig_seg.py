import cv2
import matplotlib.pyplot as plt
import easygui
from dis_bg_remover import remove_background

inputPath = easygui.fileopenbox(title="Choose image")
outputPath = easygui.filesavebox(title="Save to")

# Ensure the output file has an extension, defaulting to '.png' if none provided
if not outputPath.lower().endswith(('.png', '.jpg', '.jpeg')):
    outputPath += '.png'  # Default to PNG if no extension is provided

model_path = "isnet_dis.onnx"

# Perform background removal, getting the image and mask
img, mask = remove_background(model_path=model_path, image_path=inputPath)

# Use OpenCV to save the image (since 'img' is a numpy array)
cv2.imwrite(outputPath, img)

print(f"Image saved to {outputPath}")