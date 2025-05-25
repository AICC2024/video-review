import fitz  # PyMuPDF
import base64
import openai
import os
from dotenv import load_dotenv

load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PDF_PATH = "Naveon Dementia_Video 02_Storyboard_V2.pdf"  # ← Replace with your actual file

def convert_pdf_to_base64_images(pdf_path):
    doc = fitz.open(pdf_path)
    base64_images = []

    for page_num, page in enumerate(doc):
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")
        base64_images.append((page_num + 1, img_b64))

    return base64_images

def send_image_to_gpt4o(page_number, b64_image):
    print(f"\n📄 Page {page_number}")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Please review this storyboard slide (Page {page_number}). Provide structured feedback:\n- Overall Tone\n- What Works\n- Suggestions"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{b64_image}"
                        }
                    }
                ]
            }
        ],
        max_tokens=1000
    )
    print("🧠 GPT-4o Response:")
    print(response.choices[0].message.content)

if __name__ == "__main__":
    base64_images = convert_pdf_to_base64_images(PDF_PATH)

    for page_number, b64_image in base64_images:
        send_image_to_gpt4o(page_number, b64_image)