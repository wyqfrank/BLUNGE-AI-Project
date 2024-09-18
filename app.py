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

app = Flask(__name__)

# Load the SAM model
sam_checkpoint = "sam_vit_h_4b8939.pth"
model_type = "vit_h"
device = 'cuda' if torch.cuda.is_available() else 'cpu'

sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device=device)
predictor = SamPredictor(sam)
mask_generator = SamAutomaticMaskGenerator(sam)

# Initialize variables to store the image and interaction data
current_image = None  # PIL Image
current_image_np = None  # NumPy array
all_masks = []  # List of all possible segments
overall_mask = None  # The combined mask of selected segments

@app.route('/')
def home():
    return render_template('index.html')

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


    overall_mask = np.zeros(current_image_np.shape[:2], dtype=np.uint8)

    return jsonify({'status': 'success'})

@app.route('/click', methods=['POST'])
def click():
    global overall_mask, all_masks, current_image_np

    data = request.get_json()
    x = int(data['x'])
    y = int(data['y'])
    mode = data.get('mode', 'select')  # Ensure 'mode' is fetched correctly

    clicked_mask = None
    for mask_dict in all_masks:
        mask = mask_dict['segmentation']
        if mask[y, x]:
            clicked_mask = mask
            break

    if clicked_mask is not None:
        if mode == 'select':
            overall_mask = np.logical_or(overall_mask, clicked_mask)
        elif mode == 'unselect':
            overall_mask = np.logical_and(overall_mask, np.logical_not(clicked_mask))
    else:
        print("No segment found at the clicked point.")

    result_image = generate_masked_image()

    buffered = BytesIO()
    result_image.save(buffered, format="PNG")
    result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({'result_image': result_base64})

@app.route('/undo', methods=['POST'])
def undo():

    return jsonify({'result_image': None})

@app.route('/download_image', methods=['POST'])
def download_image():
    global overall_mask, current_image

    if overall_mask is not None and np.any(overall_mask):
        try:

            transparent_image = generate_transparent_image()


            img_io = BytesIO()
            transparent_image.save(img_io, format='PNG')
            img_io.seek(0)


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


    mask_bin = overall_mask.astype(np.uint8) * 255


    image_array = current_image_np.copy()


    display_image = image_array.copy()


    alpha = 0.5  
    dark_background = (image_array * alpha).astype(np.uint8)


    display_image[mask_bin == 0] = dark_background[mask_bin == 0]

    contours, _ = cv2.findContours(mask_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)


    display_image_bgr = cv2.cvtColor(display_image, cv2.COLOR_RGB2BGR)


    cv2.drawContours(display_image_bgr, contours, -1, (128, 128, 128), 2)  # Gray color, thickness 2


    display_image = cv2.cvtColor(display_image_bgr, cv2.COLOR_BGR2RGB)

    result_image = Image.fromarray(display_image)

    return result_image

def generate_transparent_image():
    global overall_mask, current_image

    mask_resized = cv2.resize(overall_mask.astype(np.uint8), (current_image.size[0], current_image.size[1]), interpolation=cv2.INTER_NEAREST)

    alpha_channel = Image.fromarray(mask_resized * 255).convert('L')
    image_with_alpha = current_image.copy()
    image_with_alpha.putalpha(alpha_channel)

    return image_with_alpha

if __name__ == '__main__':
    app.run(debug=True)