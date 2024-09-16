import torch
import numpy as np
from PIL import Image, ImageOps
from segment_anything import sam_model_registry, SamPredictor
import matplotlib.pyplot as plt

# Ensure the interactive backend is set
import matplotlib
matplotlib.use('TkAgg')  # Use 'Qt5Agg' if you have PyQt5 installed

# Load the model from the registry using the 'vit_h' variant
sam_model = sam_model_registry['vit_h'](checkpoint="sam_vit_h_4b8939.pth")
# Initialize the predictor
predictor = SamPredictor(sam_model)

# Load an image (make sure to provide the correct path to your image)
image_path = "03oCB48k9yoynd5BHd_Q6y06Rn9daGMECr4WzOKnC88.png"
image = Image.open(image_path).convert("RGBA")  # Ensure image is in RGBA mode for transparency

# Resize the image to ensure the long side is 1024 pixels
long_side = 1024
image.thumbnail((long_side, long_side), Image.LANCZOS)  # Use Image.LANCZOS instead of Image.ANTIALIAS

# Convert the image to a numpy array
image_np = np.array(image)

# Convert the image to a tensor and format it as BCHW (Batch, Channels, Height, Width)
image_tensor = torch.from_numpy(image_np).permute(2, 0, 1).unsqueeze(0)  # BCHW format
image_tensor = image_tensor[:, :3, :, :]  # Remove the alpha channel if present (only keep RGB)

# Set the image in the predictor
predictor.set_image(image_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy())

# The rest of your interactive code for selecting points remains the same...
# Initialize lists to store input points and labels
input_points = []
input_labels = []

# Create a figure and axes
fig, ax = plt.subplots()
ax.imshow(image_np)
plt.title("Click to add points (Left-click: Foreground, Right-click: Background).\nPress 'u' to undo last point. Close the window when done.")

# Initialize the mask display
mask_display = None

# Function to update the segmentation mask
def update_mask():
    global mask_display
    if len(input_points) == 0:
        # Clear the mask if no points
        if mask_display is not None:
            mask_display.remove()
            mask_display = None
        plt.draw()
        return
    # Convert lists to numpy arrays
    input_point = np.array(input_points)
    input_label = np.array(input_labels)
    # Perform segmentation prediction
    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=False,
    )
    # Get the mask
    mask = masks[0]

    # Remove previous mask
    if mask_display is not None:
        mask_display.remove()
    # Overlay the new mask
    mask_display = ax.imshow(mask, alpha=0.5, cmap='jet')
    plt.draw()

# Function to handle mouse click events
def onclick(event):
    if event.inaxes:
        x, y = int(event.xdata), int(event.ydata)
        if event.button == 1:  # Left-click
            input_labels.append(1)  # Foreground
            ax.plot(x, y, 'ro')  # Red dot
        elif event.button == 3:  # Right-click
            input_labels.append(0)  # Background
            ax.plot(x, y, 'bo')  # Blue dot
        else:
            return
        input_points.append([x, y])
        update_mask()

# Function to handle key press events
def onkey(event):
    if event.key == 'u':
        if len(input_points) > 0:
            # Remove last point and label
            input_points.pop()
            input_labels.pop()
            # Clear the axes and redraw the image
            ax.clear()
            ax.imshow(image_np)
            # Redraw the points
            for i, point in enumerate(input_points):
                x, y = point
                if input_labels[i] == 1:
                    ax.plot(x, y, 'ro')
                else:
                    ax.plot(x, y, 'bo')
            update_mask()
            plt.draw()

# Connect the event handlers
fig.canvas.mpl_connect('button_press_event', onclick)
fig.canvas.mpl_connect('key_press_event', onkey)

plt.show()

# After closing the window, apply the mask to the original image and save with transparent background
if len(input_points) > 0:
    # Convert lists to numpy arrays
    input_point = np.array(input_points)
    input_label = np.array(input_labels)
    # Perform segmentation prediction
    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=False,
    )
    # Get the mask
    mask = masks[0]

    # Convert mask to uint8 format
    mask = (mask * 255).astype(np.uint8)

    # Create an alpha channel based on the mask (255 for foreground, 0 for background)
    alpha_channel = Image.fromarray(mask).resize(image.size)
    alpha_channel = ImageOps.invert(alpha_channel)  # Invert the mask so background is transparent

    # Add the alpha channel to the original image
    image_with_alpha = image.copy()
    image_with_alpha.putalpha(alpha_channel)

    # Save the final image with a transparent background
    image_with_alpha.save('image_with_transparent_background.png', 'PNG')
    print("Image with transparent background saved as 'image_with_transparent_background.png'.")