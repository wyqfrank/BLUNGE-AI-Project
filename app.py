"""
Setting up environment
"""
import sys
import os

#Use if the SAM model is in a seperate Directory (RECOMENDED)
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

    # Create an image to visualize all masks with different colors
    mask_image = np.zeros_like(current_image_np)

    # Assign a unique color to each mask
    for idx, mask_dict in enumerate(all_masks):
        mask = mask_dict['segmentation']
        
        # Generate a random color for each mask (within RGB range)
        color = np.random.randint(0, 255, size=3, dtype=np.uint8)
        
        # Apply the mask to the image with the chosen color
        mask_image[mask == True] = color

    # Combine the original image with the colored masks
    colored_masks_image = cv2.addWeighted(current_image_np, 0.7, mask_image, 0.3, 0)

    # Convert the NumPy array back to a PIL image
    result_image = Image.fromarray(colored_masks_image)

    # Save the image to the same directory as the project
    save_path = os.path.join(os.getcwd(), 'masked_image.png')
    result_image.save(save_path)

    return jsonify({'status': 'success', 'image_path': save_path})


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
            # Add the clicked mask to the overall mask if it's not already fully added
            new_mask = np.logical_or(overall_mask, clicked_mask)
            overall_mask = new_mask
            print(f"Selected mask at point ({x}, {y}).")
        elif mode == 'unselect':
            # Remove the clicked mask from the overall mask by using logical_not
            new_mask = np.logical_and(overall_mask, np.logical_not(clicked_mask))
            overall_mask = new_mask
            print(f"Unselected mask at point ({x}, {y}).")
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
        
        overall_mask = mask_history.pop()

        result_image = generate_masked_image()

        # Convert the result image to a base64-encoded PNG
        buffered = BytesIO()
        result_image.save(buffered, format="PNG")
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({'result_image': result_base64})
    else:
        # No more undo steps available
        return jsonify({'error': 'No more undo steps available.'}), 400
# hi
@app.route('/download_image', methods=['POST'])
def download_image():
    global overall_mask, current_image

    if overall_mask is not None and np.any(overall_mask):
        print("~~~~~Downloading~~~~~")
        try:
            # Generate the transparent image
            transparent_image = generate_transparent_image()

            print("~~~~~Generated!~~~~~")

            # Save the image to a BytesIO object
            img_io = BytesIO()
            transparent_image.save(img_io, format='PNG')
            img_io.seek(0)

            print("~~~~~Saved image to BytesIO~~~~~")

            # Send the image as a file response
            print("~~~~~Sending file~~~~~")
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

    result_image = Image.fromarray(display_image)

    return result_image

def generate_transparent_image():
    global overall_mask, current_image

    # Resize mask to match the original image size if needed
    mask_resized = cv2.resize(overall_mask.astype(np.uint8), (current_image.size[0], current_image.size[1]), interpolation=cv2.INTER_NEAREST)

    # ---- Apply Gaussian blur to soften edges ----
    # Apply Gaussian blur to the mask for smoother edges
    blurred_mask = cv2.GaussianBlur(mask_resized, (31, 31), 0)
    
    # Normalize the mask to make sure it's binary (between 0 and 255)
    mask_normalized = (blurred_mask / np.max(blurred_mask) * 255).astype(np.uint8)

    # Convert the mask to an alpha channel (255 for opaque, 0 for fully transparent)
    alpha_channel = Image.fromarray(mask_normalized).convert('L')

    # Add the alpha channel to the original image
    image_with_alpha = current_image.copy()
    image_with_alpha.putalpha(alpha_channel)

    return image_with_alpha

@app.route('/regenerate_masked_image', methods=['POST'])
def regenerate_masked_image():
    global current_image_np, overall_mask

    if overall_mask is not None:
        # Regenerate the masked image with the darkened background for unmasked areas
        result_image = generate_masked_image()

        # Convert the result image to a base64-encoded PNG
        buffered = BytesIO()
        result_image.save(buffered, format="PNG")
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({'result_image': result_base64})
    else:
        return jsonify({'error': 'No mask available to regenerate.'}), 400

if __name__ == '__main__':
    app.run(debug=True)