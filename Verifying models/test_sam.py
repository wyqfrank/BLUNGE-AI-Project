import torch
import numpy as np
from PIL import Image
from segment_anything import sam_model_registry, SamPredictor
import matplotlib.pyplot as plt
import cv2  # For image processing

# Load the SAM model
sam_model = sam_model_registry['vit_h'](checkpoint="sam_vit_h_4b8939.pth")
sam_model.to(device='cuda' if torch.cuda.is_available() else 'cpu')
predictor = SamPredictor(sam_model)

# Load and preprocess the image
image_path = "03oCB48k9yoynd5BHd_Q6y06Rn9daGMECr4WzOKnC88.png"  # Replace with your image path
image = Image.open(image_path).convert("RGB")  # Convert to RGB mode (3 channels)

# Function to resize the image to have the long side exactly 1024 pixels
def resize_image(image, long_side=1024):
    width, height = image.size
    if width >= height:
        new_width = long_side
        new_height = int(round((height * long_side) / width))
    else:
        new_height = long_side
        new_width = int(round((width * long_side) / height))
    return image.resize((new_width, new_height), Image.LANCZOS)

# Resize the image
image = resize_image(image)

# Convert the image to a NumPy array and ensure it's uint8
image_np = np.array(image).astype(np.uint8)

# Verify the image shape and data type
print(f"Image shape: {image_np.shape}, Data type: {image_np.dtype}")
assert image_np.ndim == 3 and image_np.shape[2] == 3, "Image must be of shape [H, W, 3]"

# Set the image in the predictor
predictor.set_image(image_np)

# Initialize lists for interactive input
input_points = []
input_labels = []

# Create a figure and axes
fig, ax = plt.subplots()
ax.imshow(image_np)
plt.title("Left-click: Foreground, Right-click: Background\nPress 'u' to undo. Close window when done.")

# Initialize the mask display and image display
mask_display = None
image_display = None

# Function to update the segmentation mask and display
def update_mask():
    global mask_display, image_display
    if len(input_points) == 0:
        # Clear the mask and display the original image
        if mask_display is not None:
            mask_display.remove()
            mask_display = None
        if image_display is not None:
            image_display.remove()
            image_display = None
        ax.imshow(image_np)
        plt.draw()
        return
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
    image_array = image_np.copy()

    # Convert image to grayscale
    image_gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

    # Stack grayscale image to have 3 channels
    image_gray_3ch = cv2.cvtColor(image_gray, cv2.COLOR_GRAY2RGB)

    # Create a composite image
    display_image = np.zeros_like(image_array)
    display_image[mask_bin == 255] = image_array[mask_bin == 255]  # Foreground in color
    display_image[mask_bin == 0] = image_gray_3ch[mask_bin == 0]   # Background in grayscale

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

    # Remove previous image display
    if image_display is not None:
        image_display.remove()
    # Display the composite image
    image_display = ax.imshow(display_image)
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
                color = 'ro' if input_labels[i] == 1 else 'bo'
                ax.plot(x, y, color)
            update_mask()
            plt.draw()

# Function to post-process the mask
def post_process_mask(mask):
    # Convert mask to uint8 format
    mask = (mask * 255).astype(np.uint8)

    # Define a kernel size for morphological operations
    kernel_size = 5  # Adjust this value as needed
    kernel = np.ones((kernel_size, kernel_size), np.uint8)

    # Apply morphological closing (dilation followed by erosion)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # Apply morphological opening (erosion followed by dilation)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    # Apply Gaussian blur to smooth edges
    mask = cv2.GaussianBlur(mask, (5, 5), 0)

    return mask

# Connect the event handlers
fig.canvas.mpl_connect('button_press_event', onclick)
fig.canvas.mpl_connect('key_press_event', onkey)

plt.show()

# After closing the window, save the final image with transparent background
if len(input_points) > 0:
    # Perform segmentation prediction again to get the final mask
    masks, _, _ = predictor.predict(
        point_coords=np.array(input_points),
        point_labels=np.array(input_labels),
        multimask_output=False,
    )
    mask = masks[0]
    mask_processed = post_process_mask(mask)

    # Create an alpha channel based on the processed mask
    alpha_channel = Image.fromarray(mask_processed).resize(image.size)

    # Add the alpha channel to the original image
    image_with_alpha = image.copy()
    image_with_alpha.putalpha(alpha_channel)

    # Save the final image with a transparent background
    image_with_alpha.save('image_with_transparent_background.png', 'PNG')
    print("Image with transparent background saved as 'image_with_transparent_background.png'.")