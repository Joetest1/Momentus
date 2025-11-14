# H10 Heart Rate Monitor Setup & Integration Guide

## 🎯 **What You Now Have**

### **✅ Direct Web Bluetooth Integration**
Your H10 management page now includes **real-time Web Bluetooth connectivity**:
- **Direct browser connection** to Polar H10 devices
- **Live heart rate monitoring** during meditation sessions
- **No phone app required** for basic monitoring
- **Real-time meditation sessions** with HR data

## 🚀 **How to Use the New System**

### **1. Access Your H10 Management**
```
http://localhost:3000/admin.html
→ Click "🚀 Open H10 Management Page"
OR
http://localhost:3000/h10-management.html (direct)
```

### **2. Add Participants with Real Bluetooth**
1. **Turn on your H10**: Press button until LED blinks
2. **Put on chest strap**: Ensure good skin contact
3. **Click "📡 Scan for H10 Devices"** in the management page
4. **Select your H10** from the browser's Bluetooth dialog
5. **Fill in participant details** (ID auto-filled from device)
6. **Click "➕ Add Participant"**

### **3. Test Real Connection**
1. **Click "🔍 Test Connection"** on any participant
2. **See live heart rate** displayed immediately
3. **Connection status updates** automatically

### **4. Start Live Meditation Session**
1. **Click "▶️ Start Session"** (only works when connected)
2. **New meditation window opens** with:
   - **Live heart rate display**
   - **Session timer**
   - **Meditation generation button**
   - **Real-time HR logging**

## 🔧 **Technical Requirements**

### **Browser Support**
- ✅ **Chrome/Chromium** (recommended)
- ✅ **Microsoft Edge**
- ❌ **Safari** (no Web Bluetooth support)
- ❌ **Firefox** (limited Web Bluetooth support)

### **HTTPS Requirement**
- **Development**: Works on `localhost` (HTTP is allowed)
- **Production**: Requires HTTPS for Web Bluetooth API
- **Self-signed certificates** work fine

### **Device Compatibility**
- ✅ **Polar H10** (primary support)
- ✅ **Any Bluetooth LE heart rate monitor** with standard Heart Rate Service
- ✅ **Multiple devices** can be paired and managed

## 📊 **What the System Captures**

### **Real-Time Data**
```javascript
{
  timestamp: "2025-11-11T15:30:45.123Z",
  heartRate: 72,
  sessionTime: 125000,  // milliseconds since session start
  participantId: "ABC"
}
```

### **Session Data**
- **Heart rate timeline** throughout meditation
- **Session duration** with automatic timing
- **Participant identification** linked to HR data
- **Meditation content** generated based on current state

## 🎭 **Meditation Integration**

### **Automatic Meditation Generation**
During live sessions, click **"🌊 Generate Entrainment Meditation"** to:
1. **Call your existing meditation API** with session context
2. **Display meditation content** in the session window
3. **Continue heart rate monitoring** during meditation
4. **Log everything** for analysis

### **Session Management**
- **Multiple concurrent sessions** supported
- **Session history** tracked per participant
- **Export capabilities** for research data
- **Real-time status** in management dashboard

## 🔄 **Backup Options (If Web Bluetooth Fails)**

### **Phone App Method**
If browser compatibility is an issue:

1. **Download Polar Beat** (free app)
2. **Pair H10 to phone**
3. **Start recording** during meditation
4. **Export data** as GPX/CSV
5. **Import to H10 management page**

### **Manual Data Entry**
- **CSV upload** feature in management page
- **Manual session logging** with timestamps
- **Retrospective data analysis**

## 📱 **Mobile Integration**

### **Responsive Design**
- **Full mobile support** for management interface
- **Touch-friendly** participant management
- **Mobile browser limitations** (Web Bluetooth support varies)

### **Phone App Complement**
- **Use Polar Beat** for backup/verification
- **Export session data** for cross-referencing
- **Phone notifications** during long sessions

## 🎯 **Next Steps**

### **Try It Now**
1. **Start your server**: `npm start` (should be running)
2. **Open**: `http://localhost:3000/h10-management.html`
3. **Turn on H10** and click **"Scan for H10 Devices"**
4. **Add yourself** as a test participant
5. **Test connection** and **start a session**

### **Production Deployment**
For live use with participants:
1. **Set up HTTPS** (required for Web Bluetooth)
2. **Test with multiple H10 devices**
3. **Configure session data export**
4. **Set up regular data backups**

## 🔍 **Troubleshooting**

### **"Bluetooth not supported"**
- **Switch to Chrome/Edge**
- **Ensure localhost/HTTPS**
- **Check browser flags** (`chrome://flags/#enable-web-bluetooth`)

### **"Device not found"**
- **Check H10 battery** (LED should be solid/blinking)
- **Ensure skin contact** on chest strap
- **Try pairing/unpairing**
- **Restart browser** and try again

### **Connection drops**
- **Stay within 10m range**
- **Check for interference** (other Bluetooth devices)
- **H10 battery level** affects connection stability

Your H10 management system now provides **research-grade real-time heart rate monitoring** integrated directly with your meditation generation system!