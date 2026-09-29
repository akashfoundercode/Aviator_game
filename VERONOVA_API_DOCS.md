# Aviator Game - Veronova Live APIs Complete Documentation

Ye document Aviator game me use ho rahi sabhi live Veronova APIs ka complete reference guide hai. Isme har ek API ka:
- **Kis liye hai (Purpose)**
- **Method & URL**
- **Request Payload (Kya data ja raha hai)**
- **Response Data (Kya data wapas aa raha hai aur har field ka matlab)**
- **Frontend me kahan use ho raha hai**
detail me diya gaya hai.

---

## Index of APIs

1. [Profile API (`/api/profile`)](#1-profile-api)
2. [Last Five / Recent Results API (`/api/aviator_last_five_result`)](#2-last-five--recent-results-api)
3. [Place Bet API (`/api/aviator_bet`)](#3-place-bet-api)
4. [Cashout API (`/api/aviator_cashout`)](#4-cashout-api)
5. [Bet History API (`/api/aviator_history`)](#5-bet-history-api)
6. [Round Manager API (`/Aviator/result_half_new.php`)](#6-round-manager-api)
7. [Result Insert API (`/Aviator/result_insert_new.php`)](#7-result-insert-api)

---

## 1. Profile API

### 📌 Kis Liye Hai (Purpose):
Player ka live wallet balance, username, profile photo, mobile, email, referral code aur withdrawal limits fetch karne ke liye.

- **Method:** `GET`
- **Endpoint:** `https://root.veronova.co.in/api/profile?id=1`
- **Query Parameters:**
  - `id`: Player ka User ID (Default: `1`)

### 📤 Request Payload:
None (GET query parameter: `?id=1`)

### 📥 Real Server Response:
```json
{
  "success": 200,
  "message": "Data found",
  "data": {
    "id": 1,
    "mobile": "1234567890",
    "email": "admin@gmail.com",
    "username": "Admin",
    "userimage": "https://root.bdgcassino.com/uploads/profileimage/4.png",
    "recharge": 0,
    "u_id": "ADMIN_123",
    "login_token": "cp4nlxrn33aduo5ownzxu",
    "referral_code": "AKHTEY",
    "illegal_count": 18,
    "wallet": 145299.12,
    "third_party_wallet": 0,
    "total_wallet": 145299.12,
    "winning_amount": 19605.22,
    "minimum_withdraw": "200",
    "maximum_withdraw": "2500",
    "last_login_time": "2026-09-29 10:47:06",
    "apk_link": "https://root.veronova.co.in/bdgcossino.apk",
    "referral_code_url": "https://veronova.co.in/register/AKHTEY",
    "aviator_link": "https://aviatorudaan.com/",
    "aviator_event_name": "bigcasino_aviator",
    "status": "1"
  }
}
```

### 🔍 Response Fields Detail:
| Field | Type | Description |
| :--- | :--- | :--- |
| `total_wallet` / `wallet` | Number | Player ka main live wallet balance (e.g. ₹1,45,299.12). |
| `winning_amount` | Number | Player ka winning amount jo withdraw ho sakta hai (e.g. ₹19,605.22). |
| `username` | String | Player ka display name (e.g. "Admin"). |
| `u_id` | String | Unique Player ID (e.g. "ADMIN_123"). |
| `userimage` | URL | Player ki avatar photo ka link. |
| `referral_code` | String | Player ka invite/referral code (e.g. "AKHTEY"). |
| `minimum_withdraw` | String | Minimum withdrawal limit (e.g. ₹200). |
| `maximum_withdraw` | String | Maximum withdrawal limit (e.g. ₹2,500). |
| `last_login_time` | String | Aakhiri baar login karne ka time. |

### 🖥️ Frontend me Kahan Use Hota Hai:
1. Top Header me **Live Balance: ₹1,45,299.12** dikhane ke liye.
2. Top Header me **Pilot Profile Badge** me username aur avatar dikhane ke liye.
3. **Pilot Profile Modal** me player ki complete profile, winning amount, referral code, aur withdrawal limits dikhane ke liye.

---

## 2. Last Five / Recent Results API

### 📌 Kis Liye Hai (Purpose):
Pichhle completed flight rounds ke crash multipliers fetch karne ke liye.

- **Method:** `GET`
- **Endpoint:** `https://root.veronova.co.in/api/aviator_last_five_result`

### 📤 Request Payload:
None

### 📥 Real Server Response:
```json
{
  "status": "200",
  "message": "success",
  "data": [
    { "price": 1.52 },
    { "price": 1.56 },
    { "price": 2.28 },
    { "price": 1.80 },
    { "price": 1.07 },
    { "price": 1.03 },
    { "price": 1.32 },
    { "price": 1.26 },
    { "price": 1.17 },
    { "price": 1.84 },
    { "price": 1.98 },
    { "price": 1.34 },
    { "price": 1.00 },
    { "price": 2.60 },
    { "price": 1.23 }
  ]
}
```

### 🔍 Response Fields Detail:
| Field | Type | Description |
| :--- | :--- | :--- |
| `status` | String | HTTP success status ("200"). |
| `data` | Array | Pichhle crash points ki list (Total 25 items). |
| `data[].price` | Number | Multiplier jis par jahaj crash hua (e.g. 1.52, 2.28). |

### 🖥️ Frontend me Kahan Use Hota Hai:
Top Header ke theek niche jo **History Bar** hoti hai, usme 25 colored multiplier pills (`1.52x`, `2.28x`, `1.80x`, etc.) render karne ke liye. Multiplier ke value ke according color auto-assign hota hai:
- `< 2.0x`: Blue badge
- `2.0x - 10.0x`: Purple badge
- `10.0x+`: Pink/Gold badge

---

## 3. Place Bet API

### 📌 Kis Liye Hai (Purpose):
Jab player flight take-off hone se pehle green **BET** button dabata hai, to uska bet server par register karne ke liye.

- **Method:** `POST`
- **Endpoint:** `https://root.veronova.co.in/api/aviator_bet`
- **Headers:** `Content-Type: application/json`

### 📤 Request Payload (Kya Data Bhejte Hain):
```json
{
  "uid": "1",
  "number": 1,
  "amount": 100,
  "game_id": 5,
  "game_sr_num": "1084816"
}
```

### 🔍 Request Fields Detail:
| Field | Type | Description |
| :--- | :--- | :--- |
| `uid` | String | Player ka User ID (e.g. "1"). |
| `number` | Integer | Bet Panel number: Left panel ke liye `1`, Right panel ke liye `2`. |
| `amount` | Number | Player ne kitne rupaye ka bet lagaya (e.g. 100). |
| `game_id` | Integer | Game ID: Aviator ke liye `5`. |
| `game_sr_num` | String | Current round ka serial number jo `result_half_new.php` se mila hai (e.g. "1084816"). |

### 📥 Real Server Response:
```json
{
  "status": 200,
  "message": "Bet placed successfully."
}
```

*Agar koi required field missing ho ya balance kam ho:*
```json
{
  "status": 400,
  "message": "Insufficient balance or invalid parameters."
}
```

### 🖥️ Frontend me Kahan Use Hota Hai:
Dual Bet Panels (Panel 1 aur Panel 2) me jab user **BET** click karta hai:
1. Balance me se bet amount deduct hoti hai.
2. Server par `POST /api/aviator_bet` call hoti hai.
3. Bet status `PENDING` se `ACTIVE` me switch ho jata hai jab flight start hoti hai.
4. Player ka wallet balance server se auto-sync ho jata hai.

---

## 4. Cashout API

### 📌 Kis Liye Hai (Purpose):
Jab jahaj ud raha ho aur player apna munafa lock karne ke liye orange **CASH OUT** button dabata hai, to cashout execute karne ke liye.

- **Method:** `POST`
- **Endpoint:** `https://root.veronova.co.in/api/aviator_cashout`
- **Headers:** `Content-Type: application/json`

### 📤 Request Payload (Kya Data Bhejte Hain):
```json
{
  "salt": "eyJ1aWQiOiIxIiwibXVsdGlwbGllciI6IjEuMDciLCJnYW1lX3NyX251bSI6IjEwODAzNzciLCJudW1iZXIiOjF9"
}
```

### 🔑 `salt` Kaise Banti Hai:
Server security ke liye ek JSON object ko base64 encode karta hai:
```json
{
  "uid": "1",
  "multiplier": "1.07",
  "game_sr_num": "1084816",
  "number": 1
}
```
JavaScript code:
```javascript
const salt = btoa(JSON.stringify({
  uid: "1",
  multiplier: "1.07",
  game_sr_num: "1084816",
  number: 1
}))
```

### 📥 Real Server Response:
*Successful Cashout hone par:*
```json
{
  "status": 200,
  "message": "Cashout success",
  "win_amount": 107.00
}
```

*Agar cashout click karne se pehle jahaj ud gaya (flew away) ho gaya:*
```json
{
  "status": 400,
  "message": "Flew Away..!"
}
```

### 🖥️ Frontend me Kahan Use Hota Hai:
1. Jab player flight ke dauran **CASH OUT** button click karta hai.
2. Instant winning cashout sound bajti hai.
3. Screen par golden **WIN TOAST** pop hota hai (e.g. `YOU WON ₹107.00 AT 1.07x`).
4. Winning amount wallet balance me credit ho jati hai aur server wallet update ho jata hai.

---

## 5. Bet History API

### 📌 Kis Liye Hai (Purpose):
User ke purane saare khele huye bets ki complete history fetch karne ke liye.

- **Method:** `POST`
- **Endpoint:** `https://root.veronova.co.in/api/aviator_history`
- **Headers:** `Content-Type: application/json`

### 📤 Request Payload:
```json
{
  "uid": "1",
  "game_id": 5
}
```

### 📥 Real Server Response:
```json
{
  "status": 200,
  "message": "Data found",
  "data": [
    {
      "id": 42,
      "uid": 1,
      "amount": 100,
      "status": 1,
      "win": 150,
      "multiplier": 1.5,
      "cashout_amount": 150,
      "crash_point": 1.82,
      "game_sr_num": "1084757",
      "number": 1,
      "datetime": "2026-09-29 11:22:28"
    },
    {
      "id": 41,
      "uid": 1,
      "amount": 1000,
      "status": 2,
      "win": 0,
      "multiplier": 0,
      "cashout_amount": 0,
      "crash_point": 1.22,
      "game_sr_num": "1084755",
      "number": 1,
      "datetime": "2026-09-29 11:15:10"
    }
  ]
}
```

### 🔍 Response Fields Detail:
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Unique Bet Record ID. |
| `game_sr_num` | String | Round serial number jisme bet laga tha (e.g. "1084757"). |
| `amount` | Number | Bet lagayi gayi rashi (e.g. ₹100). |
| `status` | Integer | `1` = Cashed Out (Jeeta), `2` = Lost (Haara), `0` = In Play. |
| `multiplier` | Number | Kis multiplier par cashout hua (e.g. 1.50x). |
| `win` / `cashout_amount` | Number | Kitne rupaye jite (e.g. ₹150.00). |
| `crash_point` | Number | Us round me jahaj aakhir me kis point par crash hua. |
| `datetime` | String | Bet lagane ki date aur time. |

### 🖥️ Frontend me Kahan Use Hota Hai:
1. Left Sidebar ke **"My Bets"** tab me: Har bet ka Round #, Amount, Multiplier pill, aur Payout show karta hai.
2. Left Sidebar ke **"All Bets"** tab me: Real platform betting activity show karta hai.
3. Left Sidebar ke **"Top"** tab me: Highest winning payouts rank-wise show karta hai.

---

## 6. Round Manager API

### 📌 Kis Liye Hai (Purpose):
Real-time game cycle ko server ke sath sync rakhne ke liye: Next round ka serial number kya hai aur admin ne panel se koi multiplier set kiya hai ya nahi.

- **Method:** `GET`
- **Endpoint:** `https://root.veronova.co.in/Aviator/result_half_new.php`

### 📤 Request Payload:
None

### 📥 Real Server Response:
```json
{
  "status": 200,
  "game_sr": 1084816,
  "totalamount": 0,
  "totalusers": 0,
  "highestamount": 0,
  "adminmultiply": 0,
  "adminpercent": "70",
  "loss_per": "30",
  "min_amount": "1000",
  "total_win": "0"
}
```

### 🔍 Response Fields Detail:
| Field | Type | Description |
| :--- | :--- | :--- |
| `game_sr` | Integer | Active round serial number (e.g. 1084816). |
| `adminmultiply` | Number | Agar admin ne panel se multiplier fix kiya ho (e.g. 2.50). Agar `0` hai to game standard algorithm use karta hai. |
| `totalusers` | Integer | Is round me bet karne wale total active players. |
| `totalamount` | Number | Is round me total pool amount. |
| `adminpercent` | String | Admin profit percentage target. |

### 🖥️ Frontend me Kahan Use Hota Hai:
1. Har round countdown ke start me call hota hai taaki `roundId` server ke `game_sr` ke sath 100% synchronized rahe.
2. Agar `adminmultiply > 1.0` set ho, to flight theek usi multiplier par fly away karti hai.

---

## 7. Result Insert API

### 📌 Kis Liye Hai (Purpose):
Jab flight crash hoti hai (flew away), to us round ka result server database me insert/finalize karne ke liye.

- **Method:** `POST`
- **Endpoint:** `https://root.veronova.co.in/Aviator/result_insert_new.php`
- **Headers:** `Content-Type: application/x-www-form-urlencoded` ya `application/json`

### 📤 Request Payload:
```json
{
  "game_sr": 1084816,
  "multiplier": "2.34"
}
```

### 🔍 Request Fields Detail:
| Field | Type | Description |
| :--- | :--- | :--- |
| `game_sr` | Integer | Round serial number jo abhi crash hua. |
| `multiplier` | String | Crash point multiplier jis par jahaj gaya (e.g. "2.34"). |

### 🖥️ Frontend me Kahan Use Hota Hai:
Jab plane "FLEW AWAY" hota hai, tab backend ko notify karne ke liye ye call trigger hoti hai, aur turant `aviator_last_five_result` refresh ho kar top pill bar update ho jati hai.

---

## Summary Matrix

| API Endpoint | Method | Sent Data (Request) | Received Data (Response) | Purpose in App |
| :--- | :--- | :--- | :--- | :--- |
| `/api/profile?id=1` | `GET` | `id` | Wallet, Winning, User details | Top Balance & Pilot Profile Modal |
| `/api/aviator_last_five_result` | `GET` | None | Array of 25 prices | Top Multiplier Pills Bar |
| `/api/aviator_bet` | `POST` | `uid, number, amount, game_id, game_sr_num` | Status 200 / error | Panel 1 & 2 BET Button |
| `/api/aviator_cashout` | `POST` | `salt` (base64) | Status 200 & win_amount | CASHOUT Button during flight |
| `/api/aviator_history` | `POST` | `uid, game_id: 5` | List of 34+ bet records | Sidebar "My Bets", "All Bets", "Top" |
| `/Aviator/result_half_new.php` | `GET` | None | `game_sr, adminmultiply, totalusers` | Round ID sync & Admin crash point |
| `/Aviator/result_insert_new.php` | `POST` | `game_sr, multiplier` | Status code | Crash result update on server |
