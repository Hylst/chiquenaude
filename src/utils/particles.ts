export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'burst' | 'trail' | 'sparkle';
}

export class ParticleSystem {
  particles: Particle[] = [];
  private nextId = 0;

  addBurst(x: number, y: number, color: string, count: number = 20) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        id: `p_${this.nextId++}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 3 + Math.random() * 5,
        color,
        type: 'burst',
      });
    }
  }

  addTrail(x: number, y: number, color: string) {
    this.particles.push({
      id: `p_${this.nextId++}`,
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      life: 1,
      maxLife: 0.5,
      size: 2 + Math.random() * 2,
      color,
      type: 'trail',
    });
  }

  addSparkle(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        id: `p_${this.nextId++}`,
        x,
        y,
        vx: Math.cos(angle) * 1.5,
        vy: Math.sin(angle) * 1.5,
        life: 1,
        maxLife: 1,
        size: 2,
        color,
        type: 'sparkle',
      });
    }
  }

  update() {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 1 / (60 * p.maxLife);
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;

      if (p.type === 'sparkle') {
        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? p.size : p.size / 2;
          const px = p.x + Math.cos(angle) * r;
          const py = p.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }
}
