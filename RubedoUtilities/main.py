import asyncio
import atexit
from playsound import playsound

import socketio
import tts

# media files for alert audio
media_folder = '.\\assets';

# connect to node socket
sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("I'm connected!")

@sio.event
async def connect_error(data):
    print("The connection failed!")

@sio.event
async def disconnect():
    print("I'm disconnected!")

@sio.on("message")
async def on_message(data):
    raw_text = data['rawMessage']
    clean_text = tts.clean_text(raw_text)
    tts.speak_text(clean_text)

@sio.on("follow")
async def on_follow(data):
    # get follow alert sound
    file_name = media_folder + '\\follow.mp3'

    # play follow alert sound
    playsound(file_name)

async def main():
  await sio.connect('ws://localhost:3000')
  await sio.wait()

if __name__ == "__main__":
    atexit.register(tts.exit_handler)
    asyncio.run(main())
