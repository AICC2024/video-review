import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

image_url = "https://naveon-video-storage.s3.amazonaws.com/storyboards/Naveon_Dementia_Video_02_Storyboard_V2_Page08.png"

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Please review this storyboard slide for clarity, emotional tone, and educational value. Format as:\n- Overall Tone\n- What Works\n- Suggestions"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": image_url
                    }
                }
            ]
        }
    ],
    max_tokens=1000
)

print("🧠 GPT-4o Vision Review:\n")
print(response.choices[0].message.content)