import asyncio
from playwright.async_api import async_playwright

BASE_URL = "https://trade-journal-test.preview.emergentagent.com"
OUTPUT_DIR = "/app/frontend/public/screenshots"

# iPad Pro 12.9" dimensions (2048 × 2732) - we'll use device scale factor
VIEWPORT_WIDTH = 1024
VIEWPORT_HEIGHT = 1366
DEVICE_SCALE = 2  # This gives us 2048 × 2732

SCREENS = [
    ("ipad-01-login", "/mockup-ipad-login.html"),
    ("ipad-02-dashboard", "/mockup-ipad-dashboard.html"),
    ("ipad-03-addtrade", "/mockup-ipad-addtrade.html"),
    ("ipad-04-history", "/mockup-ipad-history.html"),
    ("ipad-05-aireport", "/mockup-ipad-aireport.html"),
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
        print("\nAll iPad screenshots generated!")

asyncio.run(main())
