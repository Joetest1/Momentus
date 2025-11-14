# AI Provider Testing & Troubleshooting Guide

## 🚨 **Issues Identified**

### **Google AI Provider**: ❌ **QUOTA EXCEEDED**
```
Error: "Quota exceeded for metric: generate_content_free_tier_requests, limit: 0"
```
**Root Cause**: Your Google AI API has hit the monthly free tier limit.

### **Anthropic Provider**: ✅ **WORKING CORRECTLY**
- Successfully processing requests
- Returning proper token usage statistics
- No quota issues detected

## 🔧 **Immediate Fixes Applied**

### 1. **Updated Environment Configuration**
Changed your default AI provider from Google to Anthropic:
```bash
# In your .env file:
AI_PROVIDER=anthropic
AI_MODEL=claude-3-haiku-20240307
```

### 2. **Server Restart Required**
The server needs to restart to pick up the new configuration.

## 🎯 **Action Items**

### **Option A: Use Anthropic (Recommended)**
1. **Keep current config** - Anthropic is working perfectly
2. **Restart server**: `cd backend && npm start`
3. **Test via admin dashboard** - should work immediately
4. **Benefits**: Fast, reliable, good token limits

### **Option B: Fix Google AI**
1. **Check your Google AI Console**: https://ai.google.dev/
2. **Monitor usage**: https://ai.dev/usage?tab=rate-limit
3. **Options**:
   - Wait for quota reset (monthly)
   - Upgrade to paid tier
   - Create new Google account/project

## 🧪 **Testing Commands**

### Test Anthropic (Should Work):
```bash
curl -X POST http://localhost:3000/api/admin/test-ai \
  -H "Content-Type: application/json" \
  -d '{"provider": "anthropic", "model": "claude-3-haiku-20240307", "testMessage": "Hello test"}'
```

### Test Google (Will Fail):
```bash
curl -X POST http://localhost:3000/api/admin/test-ai \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "model": "gemini-1.5-pro", "testMessage": "Hello test"}'
```

## 📊 **Current Status**
- ✅ **Anthropic Claude**: Fully functional
- ❌ **Google Gemini**: Quota exceeded
- ✅ **Server**: Running (needs restart for new config)
- ✅ **Admin Dashboard**: Should work with Anthropic

## 🚀 **Next Steps**
1. **Restart your server**: `npm start` in the backend directory
2. **Open admin dashboard**: http://localhost:3000/admin.html
3. **Test AI generation** with entrainment meditations
4. **Everything should work** with Anthropic as the provider

The entrainment meditation generator will now use Claude instead of Gemini and should work perfectly!