from rembg import remove
import easygui
from PIL import Image

# Choose input and output paths using easygui
inputPath = easygui.fileopenbox(title="Choose image")
outputPath = easygui.filesavebox(title="Save to")

# Ensure the output file has an extension, defaulting to '.png' if none provided
if not outputPath.lower().endswith(('.png', '.jpg', '.jpeg')):
    outputPath += '.png'  # Default to PNG if no extension is provided

# Open input image, remove background, and save output
input_image = Image.open(inputPath)
output_image = remove(input_image)
output_image.save(outputPath)