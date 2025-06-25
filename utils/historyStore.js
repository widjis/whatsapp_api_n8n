import fs from 'fs'

const historyFile = './baileys_store.json'

// simple in-memory structures for chats & messages
const store = {
  chats: {},
  messages: {}
}

export const loadHistory = () => {
  if (fs.existsSync(historyFile)) {
    try {
      const data = fs.readFileSync(historyFile, 'utf-8')
      const json = JSON.parse(data)
      if (json.chats) store.chats = json.chats
      if (json.messages) store.messages = json.messages
    } catch (err) {
      console.error('Failed to load history store:', err)
    }
  }
}

export const saveHistory = () => {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(store, null, 2))
  } catch (err) {
    console.error('Failed to save history store:', err)
  }
}

export const bindHistory = sock => {
  // initial history sync results
  sock.ev.on('messaging-history.set', ({ chats, messages }) => {
    if (chats) {
      for (const chat of chats) store.chats[chat.id] = chat
    }
    if (messages) {
      for (const msg of messages) store.messages[msg.key.id] = msg
    }
  })

  // upserts new messages
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      store.messages[msg.key.id] = msg
    }
  })
}

export default { store, loadHistory, saveHistory, bindHistory }
