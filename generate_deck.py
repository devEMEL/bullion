import cairo
import math

WIDTH = 1280
HEIGHT = 720

# Color Palette (Normalized RGB)
BG_DARK = (0.03, 0.04, 0.07)        # Deep space dark #080a12
CARD_BG = (0.06, 0.08, 0.14)        # #0f1424
CARD_BORDER = (0.16, 0.20, 0.32)    # Subtle slate border
ACCENT_PRIMARY = (0.35, 0.40, 0.95) # #5865F2 Electric indigo
ACCENT_CYAN = (0.22, 0.74, 0.97)    # #38BDF8 Sky/Cyan
ACCENT_EMERALD = (0.06, 0.73, 0.51) # #10B981 Emerald
TEXT_WHITE = (1.0, 1.0, 1.0)
TEXT_MUTED = (0.58, 0.64, 0.72)     # #94A3B8 Slate
TEXT_DIM = (0.39, 0.45, 0.55)       # #64748B Dim slate
BADGE_BG = (0.12, 0.16, 0.28)

def round_rect(ctx, x, y, w, h, r):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi/2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi/2)
    ctx.arc(x + r, y + h - r, r, math.pi/2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3*math.pi/2)
    ctx.close_path()

def draw_card(ctx, x, y, w, h, r=16, bg=CARD_BG, border=CARD_BORDER, border_width=1.0):
    round_rect(ctx, x, y, w, h, r)
    ctx.set_source_rgb(*bg)
    ctx.fill_preserve()
    if border:
        ctx.set_source_rgba(border[0], border[1], border[2], 0.8)
        ctx.set_line_width(border_width)
        ctx.stroke()
    else:
        ctx.new_path()

def draw_badge(ctx, x, y, text, bg=BADGE_BG, text_color=ACCENT_CYAN, font_size=11):
    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(font_size)
    ext = ctx.text_extents(text)
    pad_h = 14
    pad_v = 7
    w = ext.width + pad_h * 2
    h = ext.height + pad_v * 2
    round_rect(ctx, x, y, w, h, h / 2)
    ctx.set_source_rgb(*bg)
    ctx.fill()
    ctx.set_source_rgb(*text_color)
    ctx.move_to(x + pad_h, y + pad_v + ext.height - 1)
    ctx.show_text(text)
    return w

def draw_text_wrapped(ctx, text, x, y, max_w, line_h, font_name="Ubuntu Sans", font_size=14, color=TEXT_MUTED, bold=False):
    weight = cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL
    ctx.select_font_face(font_name, cairo.FONT_SLANT_NORMAL, weight)
    ctx.set_font_size(font_size)
    ctx.set_source_rgb(*color)
    
    words = text.split(" ")
    lines = []
    curr_line = ""
    for w in words:
        test_line = f"{curr_line} {w}".strip()
        if ctx.text_extents(test_line).width <= max_w:
            curr_line = test_line
        else:
            if curr_line:
                lines.append(curr_line)
            curr_line = w
    if curr_line:
        lines.append(curr_line)
        
    curr_y = y
    for line in lines:
        ctx.move_to(x, curr_y)
        ctx.show_text(line)
        curr_y += line_h
    return curr_y

def draw_header(ctx, category, title, subtitle):
    # Top Category Badge / Label
    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(12)
    ctx.set_source_rgb(*ACCENT_PRIMARY)
    ctx.move_to(80, 75)
    ctx.show_text(category.upper())

    # Main Slide Title
    ctx.set_font_size(36)
    ctx.set_source_rgb(*TEXT_WHITE)
    ctx.move_to(80, 120)
    ctx.show_text(title)

    # Subtitle
    if subtitle:
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
        ctx.set_font_size(16)
        ctx.set_source_rgb(*TEXT_MUTED)
        ctx.move_to(80, 150)
        ctx.show_text(subtitle)

def draw_footer(ctx, slide_num, total_slides=10):
    # Divider line
    ctx.set_source_rgba(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2], 0.4)
    ctx.set_line_width(1)
    ctx.move_to(80, 665)
    ctx.line_to(WIDTH - 80, 665)
    ctx.stroke()

    # Brand tag
    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(11)
    ctx.set_source_rgb(*TEXT_DIM)
    ctx.move_to(80, 688)
    ctx.show_text("BULION PROTOCOL  •  LITVM ARCHITECTURE")

    # Slide number
    slide_str = f"{slide_num:02d} / {total_slides:02d}"
    ext = ctx.text_extents(slide_str)
    ctx.move_to(WIDTH - 80 - ext.width, 688)
    ctx.show_text(slide_str)

def draw_background(ctx):
    # Dark Base
    ctx.set_source_rgb(*BG_DARK)
    ctx.paint()

    # Subtle ambient lighting glow
    pat = cairo.RadialGradient(1100, 150, 50, 1100, 150, 450)
    pat.add_color_stop_rgba(0, 0.35, 0.40, 0.95, 0.08)
    pat.add_color_stop_rgba(1, 0.03, 0.04, 0.07, 0)
    ctx.set_source(pat)
    ctx.paint()

    pat2 = cairo.RadialGradient(200, 600, 50, 200, 600, 400)
    pat2.add_color_stop_rgba(0, 0.22, 0.74, 0.97, 0.06)
    pat2.add_color_stop_rgba(1, 0.03, 0.04, 0.07, 0)
    ctx.set_source(pat2)
    ctx.paint()

# ----------------- SLIDE BUILDERS -----------------

def render_slide_1(ctx):
    # Title / Cover Slide
    draw_background(ctx)
    
    # Top Badges
    bx = 80
    bx += draw_badge(ctx, bx, 140, "LIVE ON TESTNET", (0.05, 0.20, 0.15), ACCENT_EMERALD, 12) + 12
    bx += draw_badge(ctx, bx, 140, "UNISWAP V4 HOOK ARCHITECTURE", (0.12, 0.16, 0.28), ACCENT_CYAN, 12) + 12
    draw_badge(ctx, bx, 140, "LITVM NATIVE", (0.15, 0.14, 0.28), (0.75, 0.65, 0.98), 12)

    # Brand Title
    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(76)
    ctx.set_source_rgb(*TEXT_WHITE)
    ctx.move_to(80, 260)
    ctx.show_text("Bulion")

    # Accent Dot
    ctx.set_source_rgb(*ACCENT_PRIMARY)
    ctx.arc(335, 242, 10, 0, 2*math.pi)
    ctx.fill()

    # Sub-headline
    ctx.set_font_size(28)
    ctx.set_source_rgb(*TEXT_WHITE)
    ctx.move_to(80, 325)
    ctx.show_text("Fair-Launch Memecoin Launchpad with Plunge Protection")

    # Detailed pitch description
    pitch_text = "The first decentralized launchpad powered by Uniswap v4 hooks. Combining bonding-curve price discovery, fee-funded Bid-Wall price defense, and perpetual creator fee streams on LitVM."
    draw_text_wrapped(ctx, pitch_text, 80, 375, 760, 28, "Ubuntu Sans", 18, TEXT_MUTED)

    # Bottom Highlight Metrics Grid
    cards = [
        ("Zero Pre-Dump", "Linear bonding curve blocks sells during fair-launch window"),
        ("Bid-Wall Protection", "1-tick below spot algorithmic buy support funded by swap fees"),
        ("Tokenized Revenue", "Launch NFTs stream up to 70% of swap fees to creators")
    ]
    card_w = 345
    card_h = 135
    for i, (title, desc) in enumerate(cards):
        cx = 80 + i * (card_w + 35)
        cy = 485
        draw_card(ctx, cx, cy, card_w, card_h, 16, CARD_BG, CARD_BORDER)
        
        # Pill indicator
        ctx.set_source_rgb(*ACCENT_PRIMARY)
        round_rect(ctx, cx + 22, cy + 24, 6, 20, 3)
        ctx.fill()

        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(17)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 38, cy + 40)
        ctx.show_text(title)

        draw_text_wrapped(ctx, desc, cx + 22, cy + 72, card_w - 44, 20, "Ubuntu Sans", 13, TEXT_MUTED)

    draw_footer(ctx, 1)

def render_slide_2(ctx):
    # Problem Slide
    draw_background(ctx)
    draw_header(ctx, "Market Failure", "The Memecoin Launchpad Model is Broken", "Retail traders and honest creators are trapped in predatory PvP dynamics")

    problems = [
        ("01", "MEV & Sniper Exploits", "Sniper bots exploit the earliest bonding curve steps in block 0, dumping instantaneously onto genuine retail buyers and killing momentum before communities form."),
        ("02", "Zero Post-Graduation Floor", "Once tokens graduate to secondary AMM pools, liquidity is fragile and unbuffered. A single whale sell order creates a panic cliff, triggering an irreversible death spiral."),
        ("03", "Misaligned Creator Incentives", "Creators receive zero continuous monetization. With no ongoing protocol fee share, founders are economically incentivized to dump their personal dev allocations on retail.")
    ]

    card_w = 345
    card_h = 420
    for i, (num, title, body) in enumerate(problems):
        cx = 80 + i * (card_w + 35)
        cy = 195
        draw_card(ctx, cx, cy, card_w, card_h, 18, CARD_BG, (0.35, 0.15, 0.20))

        # Number Tag
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(32)
        ctx.set_source_rgb(0.95, 0.35, 0.35)
        ctx.move_to(cx + 28, cy + 60)
        ctx.show_text(num)

        # Title
        ctx.set_font_size(20)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 28, cy + 115)
        ctx.show_text(title)

        # Divider
        ctx.set_source_rgba(1, 1, 1, 0.1)
        ctx.move_to(cx + 28, cy + 138)
        ctx.line_to(cx + card_w - 28, cy + 138)
        ctx.stroke()

        # Description
        draw_text_wrapped(ctx, body, cx + 28, cy + 175, card_w - 56, 26, "Ubuntu Sans", 15, TEXT_MUTED)

    draw_footer(ctx, 2)

def render_slide_3(ctx):
    # Solution Slide
    draw_background(ctx)
    draw_header(ctx, "The Bulion Solution", "The First Defended Launchpad on LitVM", "Architected with Uniswap v4 hooks to protect liquidity and align creators")

    solutions = [
        ("01", "Honest Bonding Curves", "Linear price discovery denominated in bUSDC. Token selling is hard-locked during the launch window, eliminating rug-pulls and insider front-running."),
        ("02", "The 'Bid-Wall' Hook", "Our flagship Uniswap v4 hook uses accumulated swap fees to deploy dynamic single-sided liquidity 1 tick below spot—cushioning massive sell-offs."),
        ("03", "Launch NFTs & Treasuries", "Ownership and monetization are tokenized via Launch NFTs. Up to 70% of swap fees stream to creators and dedicated on-chain buyback/burn treasuries.")
    ]

    card_w = 345
    card_h = 420
    for i, (num, title, body) in enumerate(solutions):
        cx = 80 + i * (card_w + 35)
        cy = 195
        draw_card(ctx, cx, cy, card_w, card_h, 18, CARD_BG, (0.18, 0.28, 0.45))

        # Number Tag
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(32)
        ctx.set_source_rgb(*ACCENT_CYAN)
        ctx.move_to(cx + 28, cy + 60)
        ctx.show_text(num)

        # Title
        ctx.set_font_size(20)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 28, cy + 115)
        ctx.show_text(title)

        # Divider
        ctx.set_source_rgba(1, 1, 1, 0.1)
        ctx.move_to(cx + 28, cy + 138)
        ctx.line_to(cx + card_w - 28, cy + 138)
        ctx.stroke()

        # Description
        draw_text_wrapped(ctx, body, cx + 28, cy + 175, card_w - 56, 26, "Ubuntu Sans", 15, (0.85, 0.90, 0.98))

    draw_footer(ctx, 3)

def render_slide_4(ctx):
    # Architecture / How It Works
    draw_background(ctx)
    draw_header(ctx, "Lifecycle & Mechanics", "How Bulion Works", "End-to-end autonomous progression from creation to defended secondary trading")

    steps = [
        ("PHASE 1", "Permissionless Launch", "Creator pays 10 bUSDC.\nClones ERC-20 token, mints Launch NFT, and sets transparent on-curve premine."),
        ("PHASE 2", "Fair-Launch Curve", "Buyers participate along a linear bonding curve in bUSDC.\nSelling blocked to protect early contributors."),
        ("PHASE 3", "Uniswap v4 Graduation", "Unsold tokens are burned.\nRaised bUSDC and remaining supply automatically seed a concentrated v4 liquidity pool."),
        ("PHASE 4", "Perpetual Bid-Wall & Fees", "Trading opens on v4.\nSwap fees waterfall directly into creator treasury and active Bid-Wall plunge support.")
    ]

    card_w = 255
    card_h = 390
    for i, (tag, title, body) in enumerate(steps):
        cx = 80 + i * (card_w + 30)
        cy = 210
        draw_card(ctx, cx, cy, card_w, card_h, 16, CARD_BG, CARD_BORDER)

        # Phase Badge
        draw_badge(ctx, cx + 20, cy + 25, tag, (0.12, 0.18, 0.32), ACCENT_PRIMARY, 10)

        # Title
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(17)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 20, cy + 95)
        ctx.show_text(title)

        # Body
        lines = body.split("\n")
        curr_y = cy + 140
        for l in lines:
            curr_y = draw_text_wrapped(ctx, l, cx + 20, curr_y, card_w - 40, 22, "Ubuntu Sans", 13, TEXT_MUTED) + 10

        # Step arrow between cards
        if i < 3:
            ctx.set_source_rgb(*ACCENT_PRIMARY)
            arrow_x = cx + card_w + 10
            arrow_y = cy + card_h / 2
            ctx.arc(arrow_x + 5, arrow_y, 4, 0, 2*math.pi)
            ctx.fill()

    draw_footer(ctx, 4)

def render_slide_5(ctx):
    # The BidWall Innovation Slide
    draw_background(ctx)
    draw_header(ctx, "Core Hook Innovation", "The 'Bid-Wall' Plunge Protection", "Algorithmic downside buffering powered directly by Uniswap v4 Hook callbacks")

    # Left Column: Mechanism
    draw_card(ctx, 80, 200, 530, 420, 18, CARD_BG, (0.22, 0.35, 0.65))
    draw_badge(ctx, 110, 225, "HOW THE HOOK OPERATES", (0.10, 0.16, 0.30), ACCENT_CYAN, 11)

    points_left = [
        ("Fee Capture Waterfall", "Every secondary swap on the Uniswap v4 pool incurs a fee. After the creator allocation, residual fees accumulate into the BidWall contract."),
        ("1-Tick Below Spot Placement", "The BidWall dynamically calculates pool spot tick and places a concentrated single-sided bUSDC liquidity order exactly 1 tick below current price."),
        ("Self-Strengthening Floor", "As trading volume surges, the Bid-Wall deepens. Dumps are absorbed by the fee-funded bid rather than free-falling through thin books.")
    ]
    curr_y = 285
    for title, desc in points_left:
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(16)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(110, curr_y)
        ctx.show_text(title)
        curr_y = draw_text_wrapped(ctx, desc, 110, curr_y + 18, 470, 22, "Ubuntu Sans", 13, TEXT_MUTED) + 16

    # Right Column: Value to Ecosystem
    draw_card(ctx, 650, 200, 550, 420, 18, CARD_BG, (0.15, 0.40, 0.30))
    draw_badge(ctx, 680, 225, "TREASURY & COMMUNITY IMPACT", (0.05, 0.20, 0.15), ACCENT_EMERALD, 11)

    points_right = [
        ("Automated Dump Cushioning", "Retail holders are protected against sudden panic capitulations. The wall acts as an algorithmic buyer of last resort."),
        ("Recycled Token Inflows", "When sellers dump into the Bid-Wall, the acquired memecoins do not sit idle—they are transferred directly into the project's Memecoin Treasury."),
        ("On-Chain Buyback & Burn", "Creators can trigger trustless treasury actions via the ActionManager contract to permanently burn acquired tokens or fuel community initiatives.")
    ]
    curr_y = 285
    for title, desc in points_right:
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(16)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(680, curr_y)
        ctx.show_text(title)
        curr_y = draw_text_wrapped(ctx, desc, 680, curr_y + 18, 490, 22, "Ubuntu Sans", 13, (0.85, 0.95, 0.90)) + 16

    draw_footer(ctx, 5)

def render_slide_6(ctx):
    # Creator Economics & Anti-Rug Design
    draw_background(ctx)
    draw_header(ctx, "Economic Alignment", "Aligning Creators with Protocol Longevity", "Eliminating one-time dump culture with sustainable on-chain revenue")

    # Comparison Grid / Table
    headers = ["Dimension", "Conventional Launchpads", "Bulion Protocol"]
    col_w = [240, 420, 420]
    start_x = 80
    start_y = 210

    # Header Row
    draw_card(ctx, start_x, start_y, sum(col_w) + 20, 50, 12, (0.10, 0.14, 0.24), CARD_BORDER)
    x = start_x + 20
    for i, h in enumerate(headers):
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(14)
        ctx.set_source_rgb(*ACCENT_CYAN if i == 2 else TEXT_WHITE)
        ctx.move_to(x, start_y + 30)
        ctx.show_text(h.upper())
        x += col_w[i]

    rows = [
        ("Creator Premine", "Free dev allocation, stealth wallets, and covert block-0 snipes.", "100% transparent on-curve purchase in bUSDC at deployment time."),
        ("Creator Monetization", "One-off exit dump onto community; zero recurring income.", "Perpetual revenue stream of up to 70% of Uniswap v4 swap fees."),
        ("Ownership Governance", "Ephemeral private keys, static admin addresses, or unverified multisigs.", "Transferable Launch NFT enabling sale, leasing, or DAO governance of rights."),
        ("Treasury Utility", "None. Unclaimed fees sit idle or are extracted by protocol founders.", "MemecoinTreasury contract with programmable on-chain Buyback & Burn modules.")
    ]

    row_y = start_y + 65
    for dim, conv, bul in rows:
        draw_card(ctx, start_x, row_y, sum(col_w) + 20, 85, 12, CARD_BG, CARD_BORDER)
        x = start_x + 20

        # Dimension
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(15)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(x, row_y + 48)
        ctx.show_text(dim)
        x += col_w[0]

        # Conventional
        draw_text_wrapped(ctx, conv, x, row_y + 35, col_w[1] - 30, 20, "Ubuntu Sans", 13, (0.95, 0.55, 0.55))
        x += col_w[1]

        # Bulion
        draw_text_wrapped(ctx, bul, x, row_y + 35, col_w[2] - 30, 20, "Ubuntu Sans", 13, ACCENT_EMERALD)
        row_y += 98

    draw_footer(ctx, 6)

def render_slide_7(ctx):
    # Technology Stack Slide
    draw_background(ctx)
    draw_header(ctx, "Architecture & Infrastructure", "Production-Grade Web3 Stack", "Engineered for security, sub-second execution, and trustless operation")

    tech_pillars = [
        ("Uniswap v4 Core", "Custom Hooks Engine", "The hook orchestrates fair launches, graduation parameters, fee cascades, and BidWall interactions inside a single execution context."),
        ("LitVM Network", "High-Speed EVM Layer", "Leveraging LitVM's high TPS, deterministic gas schedules, and rapid finality to ensure seamless trading without network congestion or fee spikes."),
        ("Real-Time Indexing", "Goldsky & Subgraphs", "Decentralized subgraphs indexing pool creations, tick liquidity distributions, token price charts, swap volumes, and user portfolio states in real time."),
        ("Reactive Interface", "Vite + React + Wagmi", "Modern frontend providing instant bonding curve quotes, one-click launches, slippage controls, faucet claims, and live liquidity telemetry.")
    ]

    card_w = 530
    card_h = 195
    coords = [(80, 205), (650, 205), (80, 425), (650, 425)]

    for (title, badge, desc), (cx, cy) in zip(tech_pillars, coords):
        draw_card(ctx, cx, cy, card_w, card_h, 16, CARD_BG, CARD_BORDER)
        
        # Badge
        draw_badge(ctx, cx + 25, cy + 25, badge, (0.12, 0.16, 0.28), ACCENT_CYAN, 10)

        # Title
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(18)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 25, cy + 78)
        ctx.show_text(title)

        # Body
        draw_text_wrapped(ctx, desc, cx + 25, cy + 105, card_w - 50, 22, "Ubuntu Sans", 13, TEXT_MUTED)

    draw_footer(ctx, 7)

def render_slide_8(ctx):
    # Market Opportunity Slide
    draw_background(ctx)
    draw_header(ctx, "Market Dynamics", "The Memecoin & Launchpad Flywheel", "Capturing market share through superior structural token defense")

    # Big Stats Grid
    stats = [
        ("$100B+", "Memecoin Asset Class", "Sustained retail capital inflows demanding safer, non-predatory infrastructure."),
        ("1st Mover", "Protected Launchpad on LitVM", "Establishing default liquidity dominance across the LitVM ecosystem."),
        ("Perpetual", "Protocol Fee Retention", "Unlike curves that lose liquidity to external DEXs, Bulion keeps volume inside v4.")
    ]

    sw = 345
    for i, (metric, label, desc) in enumerate(stats):
        cx = 80 + i * (sw + 35)
        cy = 205
        draw_card(ctx, cx, cy, sw, 185, 16, CARD_BG, CARD_BORDER)

        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(36)
        ctx.set_source_rgb(*ACCENT_CYAN)
        ctx.move_to(cx + 24, cy + 55)
        ctx.show_text(metric)

        ctx.set_font_size(15)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 24, cy + 90)
        ctx.show_text(label)

        draw_text_wrapped(ctx, desc, cx + 24, cy + 118, sw - 48, 20, "Ubuntu Sans", 13, TEXT_MUTED)

    # Narrative Card Below
    draw_card(ctx, 80, 420, 1100, 205, 18, (0.08, 0.11, 0.20), (0.25, 0.35, 0.60))
    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(20)
    ctx.set_source_rgb(*TEXT_WHITE)
    ctx.move_to(115, 465)
    ctx.show_text("Why Defended Liquidity Wins the Retail Market")

    narrative = (
        "Memecoin traders are exhausted by instant rug-pulls and predatory sniping that drain retail liquidity within minutes. "
        "By enforcing bonding curve locks and providing an algorithmic fee-funded Bid-Wall floor, Bulion builds tokens with real survivability. "
        "Projects launched on Bulion develop genuine community resilience, attracting larger volume, stickier TVL, and top-tier creators."
    )
    draw_text_wrapped(ctx, narrative, 115, 500, 1030, 26, "Ubuntu Sans", 15, (0.85, 0.90, 0.98))

    draw_footer(ctx, 8)

def render_slide_9(ctx):
    # Roadmap Slide featuring BOT CHAIN MAINNET INTEGRATION
    draw_background(ctx)
    draw_header(ctx, "Strategic Milestones", "Roadmap & Ecosystem Expansion", "Scaling from LitVM testnet to BOT Chain Mainnet and multi-chain liquidity")

    milestones = [
        ("PHASE 1", "Testnet & Core Engine", "CURRENT", [
            "Complete Uniswap v4 core & periphery deployment",
            "Hook, FairLaunch, and BidWall contracts live",
            "Full frontend launchpad, portfolio, and faucet interface",
            "Goldsky / The Graph subgraph tracking on Liteforge"
        ], (0.12, 0.16, 0.28), ACCENT_CYAN),
        
        ("PHASE 2", "Audits & LitVM Mainnet", "Q4 2026", [
            "Comprehensive smart contract and hook security audits",
            "LitVM Mainnet genesis launch with native bUSDC reserve",
            "Creator analytics dashboard and Launch NFT marketplace",
            "Onboarding initial cohort of premier launch partners"
        ], (0.15, 0.14, 0.28), (0.75, 0.65, 0.98)),

        ("PHASE 3", "BOT Chain Mainnet Integration", "EXPANSION", [
            "Full integration with BOT Chain Mainnet ecosystem",
            "Cross-chain liquidity pipelines between LitVM & BOT Chain",
            "Permissionless Treasury Action modules (DAO staking, buyback)",
            "Developer Launchpad SDK for 1-click external app embeds"
        ], (0.08, 0.25, 0.18), ACCENT_EMERALD)
    ]

    card_w = 345
    card_h = 420
    for i, (phase_tag, title, status_text, items, badge_bg, badge_color) in enumerate(milestones):
        cx = 80 + i * (card_w + 35)
        cy = 195
        
        # Highlight Phase 3 special border
        border_col = (0.20, 0.60, 0.40) if i == 2 else CARD_BORDER
        draw_card(ctx, cx, cy, card_w, card_h, 18, CARD_BG, border_col, 1.5 if i == 2 else 1.0)

        # Header Row
        draw_badge(ctx, cx + 25, cy + 25, phase_tag, badge_bg, badge_color, 10)
        draw_badge(ctx, cx + card_w - 95, cy + 25, status_text, (0.05, 0.08, 0.14), TEXT_MUTED, 9)

        # Title
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(18)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(cx + 25, cy + 92)
        ctx.show_text(title)

        # Divider
        ctx.set_source_rgba(1, 1, 1, 0.08)
        ctx.move_to(cx + 25, cy + 115)
        ctx.line_to(cx + card_w - 25, cy + 115)
        ctx.stroke()

        # Checkmark items
        item_y = cy + 145
        for item in items:
            # Bullet icon
            ctx.set_source_rgb(*badge_color)
            ctx.arc(cx + 32, item_y - 4, 3, 0, 2*math.pi)
            ctx.fill()

            item_y = draw_text_wrapped(ctx, item, cx + 45, item_y, card_w - 65, 20, "Ubuntu Sans", 13, (0.85, 0.90, 0.98)) + 12

    draw_footer(ctx, 9)

def render_slide_10(ctx):
    # Conclusion & Call to Action Slide
    draw_background(ctx)
    draw_header(ctx, "The Future of Launches", "Build and Launch on Bulion", "Partner with the flagship liquidity and launchpad layer on LitVM & BOT Chain")

    # Left Callout Box
    draw_card(ctx, 80, 205, 680, 410, 20, (0.07, 0.10, 0.18), (0.28, 0.35, 0.65), 1.5)

    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(28)
    ctx.set_source_rgb(*TEXT_WHITE)
    ctx.move_to(115, 260)
    ctx.show_text("Why Partner with Bulion?")

    core_reasons = [
        ("Defended Liquidity Standard", "Say goodbye to fragile pools and instant death spirals with automated Bid-Wall plunge support."),
        ("Aligned Creator Monetization", "Empower token founders with sustainable swap fee sharing and on-chain treasuries."),
        ("Multi-Chain Footprint", "Positioned at the epicenter of LitVM and expanding directly into BOT Chain Mainnet.")
    ]

    curr_y = 310
    for title, desc in core_reasons:
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(16)
        ctx.set_source_rgb(*ACCENT_CYAN)
        ctx.move_to(115, curr_y)
        ctx.show_text(title)
        curr_y = draw_text_wrapped(ctx, desc, 115, curr_y + 18, 610, 22, "Ubuntu Sans", 14, TEXT_MUTED) + 18

    # Right Action Box
    draw_card(ctx, 790, 205, 410, 410, 20, (0.05, 0.07, 0.13), CARD_BORDER)

    ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(22)
    ctx.set_source_rgb(*TEXT_WHITE)
    ctx.move_to(825, 260)
    ctx.show_text("Connect with the Team")

    links = [
        ("DApp Application", "litvm.bulion.app"),
        ("Ecosystem Integration", "LitVM & BOT Chain Mainnet"),
        ("Core Stack", "Uniswap v4 Hook Periphery"),
        ("Inquiries & Alliances", "team@bulion.app")
    ]

    ly = 315
    for l_title, l_val in links:
        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(11)
        ctx.set_source_rgb(*TEXT_DIM)
        ctx.move_to(825, ly)
        ctx.show_text(l_title.upper())

        ctx.select_font_face("Ubuntu Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(15)
        ctx.set_source_rgb(*TEXT_WHITE)
        ctx.move_to(825, ly + 22)
        ctx.show_text(l_val)
        ly += 65

    draw_footer(ctx, 10)

def main():
    out_pdf = "/home/dominic/Documents/dev/litvm/bullion/Bulion_Pitch_Deck.pdf"
    surface = cairo.PDFSurface(out_pdf, WIDTH, HEIGHT)
    ctx = cairo.Context(surface)

    slides = [
        render_slide_1,
        render_slide_2,
        render_slide_3,
        render_slide_4,
        render_slide_5,
        render_slide_6,
        render_slide_7,
        render_slide_8,
        render_slide_9,
        render_slide_10
    ]

    for i, slide_fn in enumerate(slides):
        slide_fn(ctx)
        surface.show_page()

    surface.finish()
    print(f"Generated {len(slides)}-slide pitch deck at: {out_pdf}")

if __name__ == "__main__":
    main()
