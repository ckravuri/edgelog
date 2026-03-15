import asyncio
from playwright.async_api import async_playwright

BASE_URL = "https://trade-journal-test.preview.emergentagent.com"
OUTPUT_DIR = "/app/frontend/public/screenshots"

# iPhone 6.7" dimensions (1284 x 2778) - we'll use device scale factor
VIEWPORT_WIDTH = 428
VIEWPORT_HEIGHT = 926
DEVICE_SCALE = 3  # This gives us 1284 x 2778

SCREENS = [
    ("01-login", "/mockup-login.html"),
    ("02-dashboard", "/mockup-dashboard.html"),
    ("03-addtrade", "/mockup-addtrade.html"),
    ("04-history", "/mockup-history.html"),
    ("05-aireport", "/mockup-aireport.html"),
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for name, path in SCREENS:
            print(f"Capturing {name}...")
            
            context = await browser.new_context(
                viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
                device_scale_factor=DEVICE_SCALE
            )
            page = await context.new_page()
            
            await page.goto(f"{BASE_URL}{path}")
            await page.wait_for_timeout(2000)
            
            await page.screenshot(
                path=f"{OUTPUT_DIR}/{name}.png",
                full_page=False
            )
            
            await context.close()
            print(f"  Saved {name}.png")
        
        await browser.close()
        print("\nAll screenshots generated!")

asyncio.run(main())
