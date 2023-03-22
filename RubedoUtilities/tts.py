import atexit
import os
import random
import re
import uuid

from better_profanity import profanity
from gtts import gTTS
from playsound import playsound

# destination for tts audio files
output_folder = '.\\output'

# profanity filtering set up
custom_bad_words = []
filter_words = [
    'puppies',
    'rainbows',
    'birdies',
]
profanity.load_censor_words(custom_bad_words)

# replace profanity with filter_words
def clean_text(text: str) -> "str":
    if (profanity.contains_profanity(text)):
        clean_text = profanity.censor(text)
        text = re.sub(r"([*])\1{1,}", random.choice(filter_words), clean_text)
    
    return text

# speak text
def speak_text(text: str):
    # generate unique identifier
    id = uuid.uuid4().hex
    file_name = output_folder + '\\' + id + '.mp3'

    # create tts file
    tts = gTTS(text)
    tts.save(file_name)

    # play tts file
    playsound(file_name)

    # delete tts file
    if os.path.exists(file_name):
        os.remove(file_name)

# register clean up function to run when app is killed
def exit_handler():
    # clean up tts files that get missed
    audio_files = os.listdir(output_folder)
    for file in audio_files:
        os.remove(output_folder + '\\' + file)
