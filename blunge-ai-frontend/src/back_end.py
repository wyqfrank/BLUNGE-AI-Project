from flask import Flask, request, send_file
from transformers import pipeline
from PIL import Image
import io

app = Flask(__name__)

# Initialize the Hugging Face pipeline for background removal
pipe = pipeline("image-segmentation", model="briaai/RMBG-1.4", trust_remote_code=True)

@app.route('/remove-background', methods=['POST'])
def remove_background():
    # Check if an image file was uploaded
    if 'image' not in request.files:
        return "No image uploaded", 400

    # Get the uploaded image
    file = request.files['image']
    image = Image.open(file)

    # Run the Hugging Face segmentation pipeline on the image
    pillow_image = pipe(image, return_mask=False)  # Process image

    # Convert the Pillow image to a BytesIO object
    img_io = io.BytesIO()
    pillow_image.save(img_io, 'PNG')
    img_io.seek(0)

    # Return the processed image
    return send_file(img_io, mimetype='image/png')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
