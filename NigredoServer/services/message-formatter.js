/**
 * Message Formatter Service
 * Handles chat message formatting, emote replacement, and badge rendering
 */

const generateEmotePlaceHolder = (index, length) => {
  let result = `${index}`;
  while (result.length < length) {
    result = '0' + result;
  }
  return result;
};

const getBadge = (id, version, badges) => {
  const binarySearch = (arr, x) => {
    const mid = Math.floor(arr.length / 2);
    if (arr.length === 1) {
      return arr[mid].set_id === x ? arr[mid].versions : null;
    }
    if (arr[mid].set_id === x) {
      return arr[mid].versions;
    }

    if (arr[mid].set_id > x) {
      const half = arr.slice(0, mid);
      return binarySearch(half, x);
    } else {
      const half = arr.slice(mid + 1, arr.length);
      return binarySearch(half, x);
    }
  };

  const badgeSet = binarySearch(badges, id);
  if (badgeSet === null) {
    return null;
  }
  const ver = badgeSet.find((v) => v.id == version);
  return ver?.image_url_2x || null;
};

const formatMessage = (message, emotes) => {
  if (emotes) {
    let result = message;
    const emoteMap = [];
    Object.keys(emotes).forEach((emoteId, index) => {
      const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/light/1.0`;
      const map = {
        html: `<img src="${emoteUrl}" alt="Emote-${emoteId}" />`,
      };

      emotes[emoteId].forEach((inst) => {
        const params = inst.split('-');
        const start = Number(params.shift());
        const end = Number(params.shift()) + 1;
        const length = end - start;
        map.placeholder = generateEmotePlaceHolder(index, length);
        result = result.substring(0, start) + map.placeholder + result.substring(end);
      });

      emoteMap.push(map);
    });

    emoteMap.forEach((emote) => {
      const regex = new RegExp(emote.placeholder, 'g');
      result = result.replace(regex, emote.html);
    });

    return result.replace(/\s\s+/g, ' ');
  }

  return message;
};

const formatMessageData = (data, message, badges) => {
  const result = {
    userId: data['user-id'],
    msgId: data['msg-id'],
    displayName: data['display-name'],
    firstMsg: data['first-msg'],
    returningChatter: data['returning-chatter'],
    messageType: data['message-type'],
    color: data.color,
    mod: data.mod,
    subscriber: data.subscriber,
    message: formatMessage(message, data.emotes),
    rawMessage: message,
    badges: '',
  };

  if (data.badges) {
    Object.keys(data.badges).forEach((b) => {
      const url = getBadge(b, data.badges[b], badges);

      if (url !== null) {
        result.badges += `<img src="${url}" alt="${b}-badge" /> `;
      }
    });
  }

  return result;
};

module.exports = {
  formatMessageData,
  formatMessage,
  getBadge,
  generateEmotePlaceHolder,
};
