import sys
import os

# Add the Segment Anything directory to the Python path
sys.path.append(os.path.expanduser("~/Desktop/segment-anything"))

# Now import Segment Anything
from segment_anything import sam_model_registry, SamPredictor

from flask import Flask, request, jsonify, render_template, send_file
import os
from io import BytesIO
import base64
import numpy as np
from PIL import Image
import torch


app = Flask(__name__)



# Load the SAM model
sam_checkpoint = "sam_vit_h_4b8939.pth"
model_type = "vit_h"
device = "cpu"  # Change to "cuda" if using a GPU

sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device)
predictor = SamPredictor(sam)

# Initialize variables to store the image and interaction data
current_image = None
input_points = []
input_labels = []

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload_image', methods=['POST'])
def upload_image():
    global current_image, predictor, input_points, input_labels

    # Reset interaction data
    input_points = []
    input_labels = []

    # Get the image file from the request
    file = request.files['image']
    image = Image.open(file.stream).convert('RGB')
    current_image = np.array(image)

    # Set the image in the predictor
    predictor.set_image(current_image)

    return jsonify({'status': 'success'})

@app.route('/click', methods=['POST'])
def click():
    global input_points, input_labels, predictor, current_image

    data = request.get_json()
    x = data['x']
    y = data['y']
    label = data['label']  # 1 for foreground, 0 for background

    # Append the new point and label
    input_points.append([x, y])
    input_labels.append(label)

    # Convert to numpy arrays
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

    # Convert the mask to a base64-encoded PNG
    mask_image = Image.fromarray((mask * 255).astype(np.uint8))
    buffered = BytesIO()
    mask_image.save(buffered, format="PNG")
    mask_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({'mask': mask_base64})

@app.route('/undo', methods=['POST'])
def undo():
    global input_points, input_labels, predictor, current_image

    if input_points:
        # Remove the last point and label
        input_points.pop()
        input_labels.pop()

        if input_points:
            # Re-run the prediction
            input_point = np.array(input_points)
            input_label = np.array(input_labels)

            masks, _, _ = predictor.predict(
                point_coords=input_point,
                point_labels=input_label,
                multimask_output=False,
            )

            mask = masks[0]
        else:
            # No points left, create an empty mask
            mask = np.zeros(current_image.shape[:2], dtype=bool)

        # Convert the mask to a base64-encoded PNG
        mask_image = Image.fromarray((mask * 255).astype(np.uint8))
        buffered = BytesIO()
        mask_image.save(buffered, format="PNG")
        mask_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({'mask': mask_base64})
    else:
        return jsonify({'mask': None})

if __name__ == '__main__':
    app.run(debug=True)
