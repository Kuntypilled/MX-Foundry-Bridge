# **MX Foundry Bridge**

MX Foundry Bridge is a Foundry VTT module that adds fast, workflow-focused layer switching and tool cycling, designed especially for use with hardware inputs such as the Logitech MX Master Action Ring, forward/back buttons, or other macro devices.

**The goal is simple:**

👉 Change layers with one action, then cycle tools visually without touching the sidebar.

**Compatible with Foundry VTT v13.**
## **Core Features**

1. One-Key Layer Switching
	
	Each major Foundry scene layer can be activated with a single configurable hotkey.
		- When you switch layers:
			- The layer becomes active
			- The first tool in that layer’s cycle list is automatically selected *(optional)*
	
	*This makes layer switching deterministic and fast — no guessing which tool is active.*

2. Context-Aware Tool Cycling
	
	Once a layer is active, you can cycle through a curated list of tools for that layer using:
		- Cycle Tool – Next
		- Cycle Tool – Previous
	
	*Only relevant tools are included — destructive or rarely-used tools are* 
	*intentionally excluded to keep cycling efficient.*

3. Visual Tool Popup (Near Cursor)
	
	While cycling tools, a small popup appears near your mouse cursor showing:
		- The tools in the current cycle
		- The currently selected tool (highlighted)
		- *Optional* layer icon at the start of the row
	
	*This allows you to cycle by feel, without looking at the sidebar.*

4. Fluid Popup Animation
	
	When enabled, the popup uses a polished animation sequence:
	- First cycle input:
		- Icons appear stacked under the cursor, then fan out into a horizontal row
	- Continued cycling:
		- The row stays in place; only the highlight moves
	- After you stop cycling:
		- Icons collapse smoothly back under the cursor and fade away
	
	*The animation timing is tied directly to the popup delay setting.*

4. Hardware-Friendly by Design
	
	MX Foundry Bridge works perfectly with:
	- Logitech MX Master 4 Action Ring
	- Forward / Back mouse buttons
	- Stream Deck / macro pads
	- Keyboard-only workflows
	
	*No Logitech plugin is required — simply bind hardware actions to Foundry hotkeys.*

## **Default Hotkeys**

All hotkeys are fully configurable in Configure Controls.

| Action                 | Default        |
| ---------------------- | -------------- |
| Token Controls         | Ctrl + Alt + T |
| Measurement Controls   | Ctrl + Alt + M |
| Tile Controls          | Ctrl + Alt + I |
| Drawing Tools          | Ctrl + Alt + D |
| Wall Controls          | Ctrl + Alt + W |
| Lighting Controls      | Ctrl + Alt + L |
| Ambient Sound Controls | Ctrl + Alt + S |
| Region Controls        | Ctrl + Alt + G |
| Journal Notes          | Ctrl + Alt + N |
| Cycle Tool - Next      | Ctrl + Alt + ] |
| Cycle Tool - Previous  | Ctrl + Alt + [ |
### Tool Cycle Lists (Per Layer)

**Token Controls**
- Select Tokens
- Select Targets
- Measure Distance

**Measurement Controls**
- Select
- Circle Template
- Cone Template
- Rectangle Template
- Ray Template

**Tile Controls**
- Select Tiles
- Place Tile

**Drawing Tools**
- Select Drawings
- Draw Rectangle
- Draw Ellipse
- Draw Polygon
- Draw Freehand
- Draw Text

**Wall Controls**
- Rectangular Select Walls
- Basic Walls
- Terrain Walls
- Invisible Walls
- Ethereal Walls
- Draw Doors
- Secret Doors
- Window Walls

**Lighting Controls**
- Draw Light Source
- Select

**Ambient Sound Controls**
- Select
- Draw Ambient Sound

**Region Controls**
- Select Regions
- Draw Rectangle
- Draw Ellipse
- Draw Polygon

**Journal Notes**
- Select Notes
- Create Map Note

## Module Settings

### Enable Tool Cycling

**Default: ON**
Enables the Cycle Tool – Next / Previous hotkeys.

---
### Reset Tool on Layer Change

**Default: ON**
Whenever you switch layers, the first tool in that layer’s cycle list is automatically selected.

*Recommended for consistency.*

---
### Show Cycling Popup

**Default: ON**
Displays the visual popup near the cursor while cycling tools.

---
### Popup Delay (ms)

**Default: 900 ms**
Controls how long after your last cycle input the popup finishes collapsing and disappears.

*This value represents the total time until the popup is fully gone — collapse timing is calculated automatically.*

---
### Show Layer Icon in Popup

**Default: OFF**
Adds the active layer’s icon to the start of the popup row.

*Useful if you frequently switch layers while cycling.*

---
### Animate Popup

**Default: ON**
Enables the floaty / elastic fan-out and collapse animation.

*Disable if you prefer instant, no-motion UI.*

---
## Recommended Hardware Setup (Logitech MX Master 4)

**Action Ring:**
Bind to layer hotkeys (Token, Walls, Lighting, etc.)

**Forward / Back Buttons:**
Bind to:
- Cycle Tool – Next
- Cycle Tool – Previous

## Compatibility Notes

- Designed for Foundry VTT v13
- Uses Foundry’s native Scene Controls API
- Compatible with most system and UI mods
- Does not override or replace default Foundry behavior
