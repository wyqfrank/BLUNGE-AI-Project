import sys
import os

# Add the Segment Anything directory to the Python path
sys.path.append(os.path.expanduser("~/Desktop/segment-anything"))

from segment_anything import sam_model_registry, SamPredictor
from flask import Flask, request, jsonify, render_template, send_file
import numpy as np
from PIL import Image
import torch
import base64
from io import BytesIO
import cv2

app = Flask(__name__)

# Load the SAM model
sam_checkpoint = "sam_vit_h_4b8939.pth"
model_type = "vit_h"
device = 'cuda' if torch.cuda.is_available() else 'cpu'

sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device=device)
predictor = SamPredictor(sam)

# Initialize variables to store the image and interaction data
current_image = None  # PIL Image
current_image_np = None  # NumPy array
input_points = []
input_labels = []

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload_image', methods=['POST'])
def upload_image():
    global current_image, current_image_np, predictor, input_points, input_labels

    # Reset interaction data
    input_points = []
    input_labels = []

    # Get the image file from the request
    file = request.files['image']
    image = Image.open(file.stream).convert('RGB')
    # Resize the image to have the long side exactly 1024 pixels
    image = resize_image(image)
    current_image = image
    current_image_np = np.array(image).astype(np.uint8)

    # Set the image in the predictor
    predictor.set_image(current_image_np)

    return jsonify({'status': 'success'})

@app.route('/click', methods=['POST'])
def click():
    global input_points, input_labels, predictor, current_image_np

    data = request.get_json()
    x = int(data['x'])
    y = int(data['y'])
    label = int(data['label'])  # 1 for foreground, 0 for background

    # Append the new point and label
    input_points.append([x, y])
    input_labels.append(label)

    # Generate and return the updated image with mask
    result_image = generate_masked_image()

    # Convert the result image to a base64-encoded PNG
    buffered = BytesIO()
    result_image.save(buffered, format="PNG")
    result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({'result_image': result_base64})

@app.route('/undo', methods=['POST'])
def undo():
    global input_points, input_labels, predictor, current_image_np, current_image

    if input_points:
        # Remove the last point and label
        input_points.pop()
        input_labels.pop()

        if input_points:
            # Generate and return the updated image with mask
            result_image = generate_masked_image()
        else:
            # No points left, display the original image
            result_image = current_image

        # Convert the result image to a base64-encoded PNG
        buffered = BytesIO()
        result_image.save(buffered, format="PNG")
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({'result_image': result_base64})
    else:
        return jsonify({'result_image': None})

@app.route('/download_image', methods=['POST'])
def download_image():
    global input_points, input_labels, predictor, current_image_np, current_image

    if input_points:
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
            download_name='segmented_image.png'  # Use 'download_name' for Flask >= 2.0
        )
    else:
        # Return a 400 Bad Request with an error message
        return jsonify({'error': 'No segmentation available. Please select some points first.'}), 400
    
def resize_image(image, long_side=1024):
    width, height = image.size
    if width >= height:
        new_width = long_side
        new_height = int(round((height * long_side) / width))
    else:
        new_height = long_side
        new_width = int(round((width * long_side) / height))
    return image.resize((new_width, new_height), Image.LANCZOS)

def post_process_mask(mask):
    # Convert mask to uint8 format
    mask = (mask * 255).astype(np.uint8)

    # Apply median blur to reduce noise
    mask = cv2.medianBlur(mask, 5)

    # Define a kernel size for morphological operations
    kernel_size = 7  # Increased kernel size for smoother mask
    kernel = np.ones((kernel_size, kernel_size), np.uint8)

    # Apply morphological closing (dilation followed by erosion)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # Apply morphological opening (erosion followed by dilation)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    # Apply Gaussian blur to smooth edges
    mask = cv2.GaussianBlur(mask, (7, 7), 0)

    return mask

def generate_masked_image():
    global current_image_np, input_points, input_labels

    # Convert lists to NumPy arrays
    input_point = np.array(input_points)
    input_label = np.array(input_labels)

    # Perform segmentation prediction
    masks, _, _ = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=False,
    )

    # Get the mask
    mask = masks[0]

    # Post-process the mask
    mask_processed = post_process_mask(mask)

    # Threshold the mask to create a binary mask
    _, mask_bin = cv2.threshold(mask_processed, 128, 255, cv2.THRESH_BINARY)

    # Convert original image to numpy array
    image_array = current_image_np.copy()

    # Create a composite image
    display_image = image_array.copy()

    # Create the darkening effect on the background
    alpha = 0.5  # Adjust the opacity level (0.0 - 1.0)
    dark_background = (image_array * alpha).astype(np.uint8)

    # Apply the darkening effect to the background areas
    display_image[mask_bin == 0] = dark_background[mask_bin == 0]

    # ---- Add Gray Outline Around the Mask ----
    # Find contours
    contours, _ = cv2.findContours(mask_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Convert display_image to BGR for OpenCV
    display_image_bgr = cv2.cvtColor(display_image, cv2.COLOR_RGB2BGR)

    # Draw the contours on the display_image
    cv2.drawContours(display_image_bgr, contours, -1, (128, 128, 128), 2)  # Gray color, thickness 2

    # Convert back to RGB
    display_image = cv2.cvtColor(display_image_bgr, cv2.COLOR_BGR2RGB)
    # -----------------------------------------

    # Convert the numpy array back to PIL Image
    result_image = Image.fromarray(display_image)

    return result_image

def generate_transparent_image():
    global current_image_np, input_points, input_labels, current_image

    # Convert lists to NumPy arrays
    input_point = np.array(input_points)
    input_label = np.array(input_labels)

    # Perform segmentation prediction
    masks, _, _ = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=False,
    )

    # Get the mask
    mask = masks[0]

    # Post-process the mask
    mask_processed = post_process_mask(mask)

    # Resize mask to match the original image size
    mask_resized = cv2.resize(mask_processed, (current_image.size[0], current_image.size[1]), interpolation=cv2.INTER_LINEAR)

    # Threshold the mask to create a binary mask
    _, mask_bin = cv2.threshold(mask_resized, 128, 255, cv2.THRESH_BINARY)

    # Create an alpha channel based on the processed mask
    alpha_channel = Image.fromarray(mask_bin).convert('L')

    # Add the alpha channel to the original image
    image_with_alpha = current_image.copy()
    image_with_alpha.putalpha(alpha_channel)

    return image_with_alpha

if __name__ == '__main__':
    app.run(debug=True)