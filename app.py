"""
Setting up environment
"""
import sys
import os

# Add the Segment Anything directory to the Python path
sys.path.append(os.path.expanduser("~/Desktop/segment-anything"))

from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator
from flask import Flask, request, jsonify, render_template, send_file
import numpy as np
from PIL import Image
import torch
import base64
from io import BytesIO
import cv2

# Initialise a new Flask web app
app = Flask(__name__)

# Load the pretrained SAM model
sam_checkpoint = "sam_vit_h_4b8939.pth"
model_type = "vit_h"
device = 'cuda' if torch.cuda.is_available() else 'cpu'

sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device=device)
predictor = SamPredictor(sam)
mask_generator = SamAutomaticMaskGenerator(sam)

mask_history = []  # Stack for undo functionality

# Initialize variables to store the image and interaction data
current_image = None  # PIL Image
current_image_np = None  # NumPy array
all_masks = []  # List of all possible segments
overall_mask = None  # The combined mask of selected segments

# Render html file, webpage for handling images
@app.route('/')
def home():
    return render_template('index.html')

"""
Handles image uploading
The uploaded image is processed, resized to 1024 pixels on the longer side, and converted to a NumPy array.
The predictor.set_image method prepares the image for future mask generation.
mask_generator.generate: Generates all possible masks for the image and stores them in all_masks.
overall_mask: Initialises a blank mask where selected segments will be added.
"""
@app.route('/upload_image', methods=['POST'])
def upload_image():
    global current_image, current_image_np, predictor, mask_generator, all_masks, overall_mask

    # Reset interaction data
    all_masks = []
    overall_mask = None

    # Get the image file from the request
    file = request.files['image']
    image = Image.open(file.stream).convert('RGB')
    # Resize the image to have the long side exactly 1024 pixels
    image = resize_image(image)
    current_image = image
    current_image_np = np.array(image).astype(np.uint8)

    # Set the image in the predictor
    predictor.set_image(current_image_np)

    # Generate all possible masks (segments)
    print("Generating all possible masks...")
    all_masks = mask_generator.generate(current_image_np)
    print(f"Generated {len(all_masks)} masks.")

    # Initialize the overall mask
    overall_mask = np.zeros(current_image_np.shape[:2], dtype=np.uint8)

    return jsonify({'status': 'success'})

"""
Handles user interactions with the image
When the user clicks on a point (x, y), the function searches through the all_masks to find the mask containing that point.
If a mask is found:
    Select mode: Adds the mask to overall_mask.
    Unselect mode: Removes the mask from overall_mask.
The function then calls generate_masked_image() to update the displayed image with the mask applied.
"""
@app.route('/click', methods=['POST'])
def click():
    global overall_mask, all_masks, current_image_np, mask_history

    data = request.get_json()
    x = int(data['x'])
    y = int(data['y'])
    mode = data.get('mode', 'select')  # 'select' or 'unselect'

    # Save the current state of the mask for undo functionality
    mask_history.append(overall_mask.copy())

    # Find the segment that contains the clicked point
    clicked_mask = None
    for mask_dict in all_masks:
        mask = mask_dict['segmentation']
        if mask[y, x]:
            clicked_mask = mask
            break

    if clicked_mask is not None:
        if mode == 'select':
            # Add the clicked mask to the overall mask
            overall_mask = np.logical_or(overall_mask, clicked_mask)
        elif mode == 'unselect':
            # Remove the clicked mask from the overall mask
            overall_mask = np.logical_and(overall_mask, np.logical_not(clicked_mask))
    else:
        print("No segment found at the clicked point.")

    # Generate and return the updated image with mask
    result_image = generate_masked_image()

    # Convert the result image to a base64-encoded PNG
    buffered = BytesIO()
    result_image.save(buffered, format="PNG")
    result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({'result_image': result_base64})

@app.route('/undo', methods=['POST'])
def undo():
    global overall_mask, mask_history

    if mask_history:
        # Revert to the last mask state by popping from the stack
        overall_mask = mask_history.pop()

        # Generate the updated image
        result_image = generate_masked_image()

        # Convert the result image to a base64-encoded PNG
        buffered = BytesIO()
        result_image.save(buffered, format="PNG")
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({'result_image': result_base64})
    else:
        # No more undo steps available
        return jsonify({'error': 'No more undo steps available.'}), 400

@app.route('/download_image', methods=['POST'])
def download_image():
    global overall_mask, current_image

    if overall_mask is not None and np.any(overall_mask):
        try:
            # Generate the transparent image
            transparent_image = generate_transparent_image()

            # Save the image to a BytesIO object
            img_io = BytesIO()
            transparent_image.save(img_io, format='PNG')
            img_io.seek(0)

            # Send the image as a file response
            return send_file(
                img_io,
                mimetype='image/png',
                as_attachment=True,
                download_name='segmented_image.png'
            )
        except Exception as e:
            print('Error in /download_image:', e)
            return jsonify({'error': 'An error occurred while generating the image.'}), 500
    else:
        return jsonify({'error': 'No segmentation available. Please select some segments first.'}), 400

def resize_image(image, long_side=1024):
    width, height = image.size
    if width >= height:
        new_width = long_side
        new_height = int(round((height * long_side) / width))
    else:
        new_height = long_side
        new_width = int(round((width * long_side) / height))
    return image.resize((new_width, new_height), Image.LANCZOS)

def generate_masked_image():
    global current_image_np, overall_mask

    # Ensure overall_mask is boolean
    mask_bin = overall_mask.astype(np.uint8) * 255

    # Convert original image to numpy array
    image_array = current_image_np.copy()

    # Create a composite image
    display_image = image_array.copy()

    # Create the darkening effect on the background
    alpha = 0.5  # Adjust the opacity level (0.0 - 1.0)
    dark_background = (image_array * alpha).astype(np.uint8)

    # Apply the darkening effect to the background areas
    display_image[mask_bin == 0] = dark_background[mask_bin == 0]

    # # ---- Add Gray Outline Around the Mask ----
    # # Find contours
    # contours, _ = cv2.findContours(mask_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # # Convert display_image to BGR for OpenCV
    # display_image_bgr = cv2.cvtColor(display_image, cv2.COLOR_RGB2BGR)

    # # Draw the contours on the display_image
    # cv2.drawContours(display_image_bgr, contours, -1, (128, 128, 128), 2)  # Gray color, thickness 2

    # # Convert back to RGB
    # display_image = cv2.cvtColor(display_image_bgr, cv2.COLOR_BGR2RGB)
    # -----------------------------------------

    # Convert the numpy array back to PIL Image
    result_image = Image.fromarray(display_image)

    return result_image

def generate_transparent_image():
    global overall_mask, current_image

    # Resize mask to match the original image size if needed
    mask_resized = cv2.resize(overall_mask.astype(np.uint8), (current_image.size[0], current_image.size[1]), interpolation=cv2.INTER_NEAREST)

    # Create an alpha channel based on the processed mask
    alpha_channel = Image.fromarray(mask_resized * 255).convert('L')

    # Add the alpha channel to the original image
    image_with_alpha = current_image.copy()
    image_with_alpha.putalpha(alpha_channel)

    return image_with_alpha

if __name__ == '__main__':
    app.run(debug=True)