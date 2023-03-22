import asyncio
import atexit

import socketio
import tts

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
    raw_text = data['message']
    clean_text = tts.clean_text(raw_text)
    tts.speak_text(clean_text)

async def main():
  await sio.connect('ws://localhost:3000')
  await sio.wait()

if __name__ == "__main__":
    atexit.register(tts.exit_handler)
    asyncio.run(main())
