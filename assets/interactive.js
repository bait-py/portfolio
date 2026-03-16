(function () {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initTimeWidget() {
        const node = document.getElementById("js-time");
        if (!node) {
            return;
        }

        function refresh() {
            const now = new Date();
            const date = now.toLocaleDateString("en-GB", {
                timeZone: "Europe/Madrid",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
            const time = now.toLocaleTimeString("en-GB", {
                timeZone: "Europe/Madrid",
                hour12: false
            });
            node.textContent = "Spain Time " + date + " " + time;
        }

        refresh();
        window.setInterval(refresh, 1000);
    }

    function initCanvasBackground() {
        const canvas = document.getElementById("ambient-canvas");
        if (!canvas || reducedMotion) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const GRID_SPACING = 34;
        const ANIMATION_SPEED = 0.01;
        const MAX_MOUSE_DISTANCE = 150;
        const RIPPLE_MAX_AGE = 2800;
        const DRAW_RIPPLE_LINES = false;

        const mouse = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        let time = 0;
        let width = 0;
        let height = 0;
        let dots = [];
        let ripples = [];

        function hexToRgb(hex) {
            return {
                r: Number.parseInt(hex.slice(1, 3), 16),
                g: Number.parseInt(hex.slice(3, 5), 16),
                b: Number.parseInt(hex.slice(5, 7), 16)
            };
        }

        const dotColor = hexToRgb("#73b8ff");

        function getMouseInfluence(x, y) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return Math.max(0, 1 - distance / MAX_MOUSE_DISTANCE);
        }

        function getRippleInfluence(x, y, now) {
            let totalInfluence = 0;

            for (const ripple of ripples) {
                const age = now - ripple.time;
                if (age >= RIPPLE_MAX_AGE) {
                    continue;
                }

                const dx = x - ripple.x;
                const dy = y - ripple.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radius = age / RIPPLE_MAX_AGE * 300;
                const widthBand = 64;

                if (Math.abs(distance - radius) < widthBand) {
                    const strength = (1 - age / RIPPLE_MAX_AGE) * ripple.intensity;
                    const proximity = 1 - Math.abs(distance - radius) / widthBand;
                    totalInfluence += strength * proximity;
                }
            }

            return Math.min(totalInfluence, 2);
        }

        function initializeDots() {
            dots = [];
            for (let x = GRID_SPACING / 2; x < width; x += GRID_SPACING) {
                for (let y = GRID_SPACING / 2; y < height; y += GRID_SPACING) {
                    dots.push({
                        x: x,
                        y: y,
                        phase: Math.random() * Math.PI * 2
                    });
                }
            }
        }

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = width + "px";
            canvas.style.height = height + "px";

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            initializeDots();
        }

        function onMouseMove(event) {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        }

        function onMouseDown(event) {
            ripples.push({
                x: event.clientX,
                y: event.clientY,
                time: Date.now(),
                intensity: 2
            });
        }

        function drawRippleLines(now) {
            if (!DRAW_RIPPLE_LINES) {
                return;
            }

            for (const ripple of ripples) {
                const age = now - ripple.time;
                if (age >= RIPPLE_MAX_AGE) {
                    continue;
                }

                const progress = age / RIPPLE_MAX_AGE;
                const radius = progress * 300;
                const alpha = (1 - progress) * 0.26 * ripple.intensity;

                ctx.beginPath();
                ctx.strokeStyle = "rgba(" + dotColor.r + ", " + dotColor.g + ", " + dotColor.b + ", " + alpha + ")";
                ctx.lineWidth = 1.6;
                ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        function draw() {
            const now = Date.now();
            time += ANIMATION_SPEED;

            ctx.clearRect(0, 0, width, height);

            for (const dot of dots) {
                const mouseInfluence = getMouseInfluence(dot.x, dot.y);
                const rippleInfluence = getRippleInfluence(dot.x, dot.y, now);
                const totalInfluence = mouseInfluence + rippleInfluence;

                const baseSize = 1.8;
                const size = baseSize + totalInfluence * 5.2 + Math.sin(time + dot.phase) * 0.3;
                const opacity = Math.max(
                    0.16,
                    0.22 + totalInfluence * 0.5 + Math.abs(Math.sin(time * 0.45 + dot.phase)) * 0.08
                );

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(" + dotColor.r + ", " + dotColor.g + ", " + dotColor.b + ", " + opacity + ")";
                ctx.fill();
            }

            drawRippleLines(now);

            ripples = ripples.filter(function (ripple) {
                return now - ripple.time < RIPPLE_MAX_AGE;
            });

            requestAnimationFrame(draw);
        }

        resize();
        draw();

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mousedown", onMouseDown);
    }

    function initCursorFollower() {
        if (reducedMotion || window.matchMedia("(max-width: 900px)").matches) {
            return;
        }

        const DOT_SMOOTHNESS = 0.2;
        const RING_SMOOTHNESS = 0.1;
        const hoverSelector = "a, button, img, input, textarea, select";

        const layer = document.createElement("div");
        layer.className = "cursor-follower-layer";

        const dot = document.createElement("div");
        dot.className = "cursor-dot";

        const ring = document.createElement("div");
        ring.className = "cursor-ring";

        layer.appendChild(dot);
        layer.appendChild(ring);
        document.body.appendChild(layer);
        document.body.classList.add("custom-cursor-enabled");

        const mousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const dotPosition = { x: mousePosition.x, y: mousePosition.y };
        const ringPosition = { x: mousePosition.x, y: mousePosition.y };

        let animationFrameId = 0;

        function lerp(start, end, factor) {
            return start + (end - start) * factor;
        }

        function onMouseMove(event) {
            mousePosition.x = event.clientX;
            mousePosition.y = event.clientY;
            layer.classList.add("is-visible");
        }

        function onMouseOver(event) {
            if (event.target instanceof Element && event.target.closest(hoverSelector)) {
                layer.classList.add("is-hovering");
            }
        }

        function onMouseOut(event) {
            if (!(event.target instanceof Element)) {
                return;
            }

            const stillInsideInteractive = event.relatedTarget instanceof Element && event.relatedTarget.closest(hoverSelector);
            if (event.target.closest(hoverSelector) && !stillInsideInteractive) {
                layer.classList.remove("is-hovering");
            }
        }

        function onWindowLeave() {
            layer.classList.remove("is-visible");
            layer.classList.remove("is-hovering");
        }

        function animate() {
            dotPosition.x = lerp(dotPosition.x, mousePosition.x, DOT_SMOOTHNESS);
            dotPosition.y = lerp(dotPosition.y, mousePosition.y, DOT_SMOOTHNESS);
            ringPosition.x = lerp(ringPosition.x, mousePosition.x, RING_SMOOTHNESS);
            ringPosition.y = lerp(ringPosition.y, mousePosition.y, RING_SMOOTHNESS);

            dot.style.left = dotPosition.x + "px";
            dot.style.top = dotPosition.y + "px";
            ring.style.left = ringPosition.x + "px";
            ring.style.top = ringPosition.y + "px";

            animationFrameId = requestAnimationFrame(animate);
        }

        window.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseleave", onWindowLeave);
        document.addEventListener("mouseover", onMouseOver);
        document.addEventListener("mouseout", onMouseOut);

        animationFrameId = requestAnimationFrame(animate);

        window.addEventListener("beforeunload", function cleanup() {
            window.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseleave", onWindowLeave);
            document.removeEventListener("mouseover", onMouseOver);
            document.removeEventListener("mouseout", onMouseOut);
            cancelAnimationFrame(animationFrameId);
            document.body.classList.remove("custom-cursor-enabled");
            layer.remove();
        }, { once: true });
    }

    initTimeWidget();
    initCanvasBackground();
    initCursorFollower();
})();
