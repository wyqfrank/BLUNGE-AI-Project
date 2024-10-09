from transformers import pipeline
from PIL import Image

# Define the image path and load the segmentation pipeline
image_path = "Test Images/test2.png"
pipe = pipeline("image-segmentation", model="briaai/RMBG-1.4", trust_remote_code=True)

# Get the segmentation results (mask and image)
pillow_mask = pipe(image_path, return_mask=True)  # outputs a pillow mask
pillow_image = pipe(image_path)  # applies mask on input and returns a pillow image

# Save the output image to a local file
output_image_path = "segmented_image.png"
pillow_image.save(output_image_path)

print(f"Segmented image saved as {output_image_path}")
