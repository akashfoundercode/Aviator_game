# Aviator / SkyRush - Veronova API Integration Guide

Ye document Veronova Aviator APIs ke exact endpoints, request payloads, aur real-time data binding ki complete guide hai.
**UI Protection:** UI ke kisi bhi component, layout ya style me koi bhi alteration nahi kiya gaya hai. Sabhi real server responses existing UI components me directly bind ho rahe hain.

---

## 1. Integrated Endpoints Overview

| API Name | Method | Full Endpoint URL | Payload / Params | Purpose in App |
| :--- | :--- | :--- | :--- | :--- |
| **Profile & Wallet** | `GET` | `https://root.veronova.co.in/api/profile?id=1` | `id` (Query param, default `1`) | Top bar me live wallet balance (`₹1,45,509.12`) & username sync. |
| **Last Five Results** | `GET` | `https://root.veronova.co.in/api/aviator_last_five_result` | None | Top History Bar ke crash multiplier pills (`1.21x`, `2.66x`, etc.). |
| **Place Bet** | `POST` | `https://root.veronova.co.in/api/aviator_bet` | `{ uid, number, amount, game_id, game_sr_num }` | Panel 1 ya 2 se bet place karne ke liye. |
| **Cashout Bet** | `POST` | `https://root.veronova.co.in/api/aviator_cashout` | `{ salt: base64(JSON) }` | Flight ke dauran winning cashout karne ke liye. |
| **Bet History** | `POST` | `https://root.veronova.co.in/api/aviator_history` | `{ uid, game_id: 5 }` | Left sidebar ke "My Bets" tab me user ki bet history dikhane ke liye. |
| **Round Manager** | `GET` | `https://root.veronova.co.in/Aviator/result_half_new.php` | None | Live round serial number (`game_sr`) aur admin target multiplier (`adminmultiply`) sync. |
| **Result Insert** | `POST` | `https://root.veronova.co.in/Aviator/result_insert_new.php` | `{ game_sr, multiplier }` | Round crash hone par result post karne ke liye. |

---

## 2. Request & Response Details

### 1. Profile API
- **Endpoint:** `GET https://root.veronova.co.in/api/profile?id=1`
- **Response:**
```json
{
  "success": 200,
  "message": "Data found",
  "data": {
    "id": 1,
    "username": "Admin",
    "wallet": 145509.12,
    "total_wallet": 145509.12,
    "winning_amount": 19605.22,
    "aviator_link": "https://aviatorudaan.com/",
    "aviator_event_name": "bigcasino_aviator"
  }
}
```
- **UI Binding:** Top Header me `Balance: ₹1,45,509.12` auto-display hota hai.

---

### 2. Last Five Result API
- **Endpoint:** `GET https://root.veronova.co.in/api/aviator_last_five_result`
- **Response:**
```json
{
  "status": "200",
  "message": "success",
  "data": [
    { "price": 1.21 },
    { "price": 2.66 },
    { "price": 1.24 },
    { "price": 1.16 },
    { "price": 2.48 }
  ]
}
```
- **UI Binding:** Top bar ke `HistoryBar` me multipliers ke pills colored badges ke roop me auto-render hote hain.

---

### 3. Place Bet API
- **Endpoint:** `POST https://root.veronova.co.in/api/aviator_bet`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "uid": "1",
  "number": 1,
  "amount": 100,
  "game_id": 5,
  "game_sr_num": "1084755"
}
```
- `number`: Panel 1 ke liye `1`, Panel 2 ke liye `2`.
- `game_sr_num`: Current active round serial number.
- **Response:**
```json
{
  "status": 200,
  "message": "Bet placed successfully."
}
```

---

### 4. Cashout API
- **Endpoint:** `POST https://root.veronova.co.in/api/aviator_cashout`
- **Request Body:**
```json
{
  "salt": "eyJ1aWQiOiIxIiwibXVsdGlwbGllciI6IjEuMDciLCJnYW1lX3NyX251bSI6IjEwODAzNzciLCJudW1iZXIiOjF9"
}
```
- **Decoded Salt Schema:**
```json
{
  "uid": "1",
  "multiplier": "1.07",
  "game_sr_num": "1084755",
  "number": 1
}
```
Code automatically is JSON ko `btoa(JSON.stringify(...))` karke salt generate karta hai.

---

### 5. Bet History API
- **Endpoint:** `POST https://root.veronova.co.in/api/aviator_history`
- **Request Body:**
```json
{
  "uid": "1",
  "game_id": 5
}
```
- **Response:**
```json
[
  {
    "id": 28,
    "uid": 1,
    "amount": 1000,
    "status": 1,
    "win": 1100,
    "cashout_amount": 1100,
    "multiplier": 1.1,
    "crash_point": 1.37,
    "game_sr_num": "1075487",
    "datetime": "2026-09-27 08:28:18"
  }
]
```
- **UI Binding:** Left Sidebar ke "My Bets" tab me round number, bet amount, multiplier aur win payout list ho jata hai.

---

### 6. Round Manager / Socket Sync
- **Endpoint:** `GET https://root.veronova.co.in/Aviator/result_half_new.php`
- **Response:**
```json
{
  "status": 200,
  "game_sr": 1084755,
  "adminmultiply": 0,
  "adminpercent": "70",
  "loss_per": "30",
  "totalamount": 0,
  "totalusers": 0
}
```
- Har round ke start me ye endpoint call hota hai:
  - `game_sr`: Round sequence ID sync hoti hai.
  - `adminmultiply`: Agar admin ne panel se custom crash multiplier fix kiya hai (e.g. `2.50`), to plane usi multiplier par fly away karta hai.
