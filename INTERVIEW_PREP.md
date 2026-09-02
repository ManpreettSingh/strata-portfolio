# Strata Portfolio — Interview Preparation Guide

This guide has been rewritten in **simple, conversational language**. These answers are designed to be easily memorized and spoken naturally during an interview. They avoid overly dense jargon while still proving you know the technical details.

## Basic / Claim-by-claim

**1. What exact problem does this project solve and for whom?**
"It solves the headache of logging into multiple apps to see your money. Most people use Zerodha for Indian stocks and Binance for crypto. My app puts everything in one place, so you can see your total net worth and how your investments are doing without juggling Excel spreadsheets."

**2. Why did I combine Indian stocks, cryptocurrencies, and global indices into one dashboard instead of separate apps?**
"Because your wealth is connected. If you want to know if you're risking too much in crypto compared to safe stocks, you need to see them together. Having them in one app makes it much easier to balance your portfolio."

**3. What does "unified dashboard" mean architecturally in my code?**
"In my database, I don't have separate tables for stocks and crypto. I just have one 'Asset' table with a 'type' tag (like STOCK or CRYPTO). This means my frontend code is much cleaner because I can use the exact same React chart and table components for everything."

**4. What WebSocket library/implementation did I use?**
"I just used the native `ws` package in Node.js. It's lightweight and fast. I didn't need the extra bulk of something heavy like Socket.IO."

**5. What did my WebSocket payload look like before optimization, and what does it look like after?**
"Before my optimization, Yahoo Finance was sending massive, unreadable binary data. My backend takes that heavy data, decodes it, and sends the frontend a tiny, simple JSON object with just the symbol, price, and percentage change. This saves a massive amount of bandwidth."

**6. What specific serialization technique did I use?**
"I used Protocol Buffers (Protobuf). Yahoo Finance uses it to stream data quickly. I had to reverse-engineer their schema to decode their live binary data into readable numbers."

**7. How exactly do I define and measure "sub-50ms latency"?**
"Latency is how long it takes for a price change to show on the user's screen. Because my backend just grabs the Yahoo data, decodes it in memory, and instantly passes it to the frontend without saving it to a database first, the delay is basically just the speed of the internet connection—usually under 50 milliseconds."

**8. What React 19 features does my code actually use?**
"I used React 19 because it powers TanStack Start, the framework I used for routing and Server-Side Rendering (SSR). React 19 handles data fetching and page transitions much smoother than older versions."

**9. Where in my code is SSR implemented?**
"It's built-in through TanStack Start and TanStack Router. When you load a page, the server builds the HTML first (using the Nitro engine), so you don't stare at a blank screen while the JavaScript loads."

**10. What specific metric did I use to measure the 40% load-speed improvement?**
"I looked at standard web vitals like First Contentful Paint (FCP). Because the app uses Server-Side Rendering (SSR) and Cloudflare caching, the user sees the page layout instantly instead of waiting for a heavy React bundle to download."

**11. How is my app configured for deployment on Cloudflare Pages?**
"In my Vite config file, I set it to use the Nitro 'cloudflare-pages' preset. This automatically packages the server code to run perfectly on Cloudflare's edge servers without complex setup."

**12. What does "global edge-caching" mean for my specific setup?**
"It means the app isn't just running on one server in one city. Cloudflare puts my static files (like images) and my server logic on servers all around the world, physically close to whoever is using the app."

**13. How is Google OAuth implemented in my code?**
"I used the `@react-oauth/google` package on the frontend to show the login button. When the user logs in, Google gives me a token. I send that token to my Node.js backend, which securely verifies it with Google before letting the user in."

**14. Where is the session/token stored after login in my code?**
"After login, the user gets a secure token that is saved in the browser (usually an HttpOnly cookie or localStorage) to keep them logged in across visits."

**15. Which Recharts components do I actually use?**
"I used `AreaChart` and `LineChart` for the historical price graphs, and `PieChart` to show how the portfolio is divided. I also used the `Tooltip` component so users can hover over the charts to see exact numbers."

**16. Which LLM API/provider did I integrate?**
"I used Google Gemini's API."

**17. What does my prompt to the LLM actually contain?**
"I send Gemini a very specific template. I give it the total portfolio value, the profit/loss, and a list of all the user's holdings. I also tell it exactly how to format the answer, like asking for a 'Key Risks' table and bullet points for strengths."

**18. How is the PDF generated?**
"It's done completely in the browser using a library called `html2pdf.js`. The server isn't involved at all."

**19. What triggers the "one-click" export?**
"When you click the export button, a function copies the AI report you see on the screen, applies some formatting, and converts that exact visual layout into a PDF file that downloads automatically."

---

## Intermediate — data flow & code structure

**20. Walk me through the full data path in my code:**
"1. Yahoo Finance sends raw binary data to my backend. 2. My backend decodes it and finds the price. 3. My backend sends a simple JSON price update to the frontend via WebSockets. 4. React sees the new price, updates the state, and the chart moves."

**21. What's my actual file/folder structure?**
"It's a standard separation. The frontend has 'components' (buttons, charts) and 'routes' (pages). The backend has 'controllers' (to handle HTTP requests) and 'services' (the heavy lifting, like the AI logic or WebSocket connections)."

**22. How do I handle reconnection if a WebSocket connection drops?**
"If the Yahoo WebSocket disconnects, my backend detects the 'close' event and automatically runs a timer to try reconnecting every 5 seconds, as long as users are still active on the app."

**23. How do I differentiate live ticks from historical data?**
"Live, blinking prices come through the WebSocket so they are instant. Historical chart data (like the 1-year graph) is fetched once via a normal REST API because it doesn't need to change every second."

**24. Is there rate-limiting or throttling anywhere?**
"Yes, the normal API routes use an express rate-limiter to stop spam. Also, my AI service has a backup system: if one Gemini model hits a rate limit, my code automatically catches the error and tries the next available model."

**25. How do I prevent one user from receiving another user's data over the WebSocket?**
"The WebSocket doesn't send 'portfolio' data, it only sends public stock prices (like 'Apple is at $150'). Users only get the prices they specifically subscribe to. Their private holdings are kept safe behind a secure API."

**26. How do I handle currency conversion?**
"My database saves a 'currency' tag for every asset and a 'baseCurrency' for the portfolio. This lets the app know if it needs to convert rupees to dollars before doing the math for the dashboard."

**27. What happens when a market is closed?**
"Yahoo stops sending WebSocket updates when the market is closed. My backend just sits quietly, and the frontend keeps showing the last known closing price without crashing."

**28. How do I cache or avoid re-fetching historical chart data?**
"I use TanStack React Query on the frontend. It caches (remembers) the historical chart data so if you switch tabs and come back, it doesn't have to download the same heavy data again."

**29. What does my database schema actually look like?**
"It's built with Prisma on PostgreSQL. I have a 'User' who owns 'Portfolios'. A Portfolio contains 'Holdings' (what you own) and 'Transactions' (your buy/sell history). I also have an 'Asset' table that works like a master dictionary of all stock symbols."

**30. What happens if the LLM API call fails?**
"I built a fallback loop. If 'gemini-2.5-flash' fails or times out, the code automatically tries 'gemini-1.5-flash', and so on. If they all fail, it gives the user a polite error message."

**31. Do I sanitize or validate LLM output?**
"The AI returns Markdown (like bold text and lists). The frontend uses a Markdown viewer to render it. It's safe because we strictly control the prompt and the Markdown parser restricts dangerous HTML."

**32. Are there any disclaimers or guardrails?**
"Yes, my prompt strictly tells Gemini to include a disclaimer saying 'this is not financial advice' at the end of the report."

---

## Advanced / conceptual

**33. What would break first with 100k concurrent WS connections?**
"The backend is a single Node.js server. If 100,000 people connected at once, trying to send price updates to all of them at the exact same millisecond would freeze the server's event loop and run out of memory."

**34. Where's the single point of failure in my current system?**
"The live data depends entirely on the Yahoo Finance connection. If Yahoo blocks my server's IP address, the live prices stop working for everyone instantly."

**35. How would I redesign the WebSocket fan-out to scale horizontally?**
"I would use Redis. I'd have one small server just listening to Yahoo and publishing prices to Redis. Then, I could have dozens of user-facing servers that just read from Redis and pass the data to users. This lets me add as many servers as I need."

**36. What's the actual performance bottleneck in Recharts?**
"Recharts is great, but it uses SVG (drawing shapes with code). If you update the data 10 times a second, the browser struggles to redraw all those shapes. For super-fast trading charts, a Canvas-based library is much better."

**37. Is there anything that would cause a hydration mismatch?**
"This happens if the server renders the HTML with a local timestamp (like '3:00 PM'), but by the time the browser loads it, it's '3:01 PM'. React gets confused because the server and browser HTML don't match exactly."

**38. What security vulnerabilities exist in my current implementation?**
"The WebSocket endpoint doesn't require strict authentication right now, so technically anyone could connect to my server and listen to the live public price feed, even if they aren't logged in."

**39. Are any API keys or secrets exposed?**
"No, the Gemini API key is kept safely on the backend in a hidden `.env` file. It never touches the browser."

**40. What's the CAP-theorem trade-off implicit here?**
"For live prices, I care most about Availability—if a price tick drops, it's fine, we just want the feed to keep running. But for the database (user holdings), I care about Consistency—your buy/sell records must be 100% accurate and ACID compliant."

**41. How would I add a new asset class with minimal changes?**
"It's very easy. Because the database uses a generic 'Asset' table, I just add a new enum type (like 'US_STOCK') to Prisma. I don't need to create new database tables or rewrite the UI components."

**42. What monitoring or logging exists?**
"Right now I just use standard `console.log`. In a real company, I'd want something like Datadog or Sentry so I get an email alert if the server crashes or the AI API starts failing."

**43. What's the most fragile or "hacky" part to rewrite?**
"Relying on Yahoo's undocumented Protobuf data stream. It's incredibly fast, but if Yahoo changes their code tomorrow, my app breaks. I'd pay for an official API like Alpaca or Polygon if I had a budget."

---

## Situational

**44. What was probably the hardest bug I had to debug?**
"Definitely figuring out how to read Yahoo's live data. Instead of simple JSON, they send compressed binary Protobuf data. Finding the right schema and decoding it without the server crashing was a huge challenge."

**45. What's a realistic story of an early mistake?**
"At first, I tried fetching prices by repeatedly asking the standard Yahoo REST API every few seconds. Yahoo quickly blocked me for spamming them. That's why I had to learn WebSockets and Protobuf to stream it the right way without getting banned."

**46. Highest-impact feature to add next?**
"Letting users upload a CSV file or connect their broker to automatically import their buy/sell history. Manually typing in trades is annoying, so automating that would get a lot more users to stick around."

**47. Most impressive piece of engineering to highlight?**
"The custom WebSocket proxy. Instead of users connecting straight to Yahoo (which causes CORS issues and exposes logic), my backend acts as a highly efficient middleman. It takes heavy binary data, shrinks it into tiny JSON, and distributes it to users instantly."

**48. Where might an interviewer find a gap?**
"If an interviewer pressed me on 'enterprise scale', I'd admit the WebSocket server currently runs on just one Node instance. But knowing how to fix it (by explaining the Redis Pub/Sub architecture) shows I understand the limits of my own code and how to scale it."
