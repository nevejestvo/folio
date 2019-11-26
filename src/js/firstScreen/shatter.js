import * as h from './help'
import boom from './boom'


export default function shatter() {
    let p0, p1, p2, fragment, id;
    let cfg = h.cfg.shatter;
    let tl0 = new TimelineMax({ onComplete: booom });
    // let tl0 = new TimelineMax();

    id = h.imgID;

    for (let i = 0; i < h.indices.length; i += 3) {

        p0 = h.vertices[h.indices[i + 0]];
        p1 = h.vertices[h.indices[i + 1]];
        p2 = h.vertices[h.indices[i + 2]];

        fragment = new Fragment(p0, p1, p2, id);


        let element = fragment.canvas;

        let dx = fragment.centroid[0] - h.clickPosition[0],
            dy = fragment.centroid[1] - h.clickPosition[1],
            d = Math.sqrt(dx * dx + dy * dy),
            delay = d * cfg.fragmentDelay * h.randomRange(
                cfg.fragmentDelayRandomMin,
                cfg.fragmentDelayRandomMax,
            );

        element.style.zIndex = Math.floor(d).toString();

        let tl1 = new TimelineMax();

        tl0.insert(tl1, delay);

        tl1.to(element, cfg.shatteredOpacitySpeed, {
            alpha: cfg.shatteredOpacityOfFragment,
        }, cfg.shatteredOpacityDelayBefore);


        h.fragments.push({fragment: fragment});

        h.container.appendChild(element);
    }

    $(h.container).find("img").addClass('hidden');

}


function booom() {
    boom(h.fragments, h.imgID)
}



//////////////
// FRAGMENT
//////////////

let Fragment = function (v0, v1, v2, id) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.id = id;

    this.computeBoundingBox();
    this.computeCentroid();
    this.createCanvas();
    this.clip();
};

Fragment.prototype = {
    computeBoundingBox: function () {
        let xMin = Math.min(this.v0[0], this.v1[0], this.v2[0]),
            xMax = Math.max(this.v0[0], this.v1[0], this.v2[0]),
            yMin = Math.min(this.v0[1], this.v1[1], this.v2[1]),
            yMax = Math.max(this.v0[1], this.v1[1], this.v2[1]);

        this.box = {
            x: xMin,
            y: yMin,
            w: xMax - xMin,
            h: yMax - yMin
        };
        // console.log(`${this.box.w} : ${this.box.h}`);

    },
    computeCentroid: function () {
        let x = (this.v0[0] + this.v1[0] + this.v2[0]) / 3,
            y = (this.v0[1] + this.v1[1] + this.v2[1]) / 3;

        this.centroid = [x, y];
    },
    createCanvas: function () {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.box.w;
        this.canvas.height = this.box.h;
        this.canvas.style.width = this.box.w + 'px';
        this.canvas.style.height = this.box.h + 'px';
        this.canvas.style.left = this.box.x + 'px';
        this.canvas.style.top = this.box.y + 'px';
        this.ctx = this.canvas.getContext('2d');

    },
    clip: function () {
        this.ctx.translate(-this.box.x, -this.box.y);
        this.ctx.beginPath();
        this.ctx.moveTo(this.v0[0], this.v0[1]);
        this.ctx.lineTo(this.v1[0], this.v1[1]);
        this.ctx.lineTo(this.v2[0], this.v2[1]);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.drawImage(h.img, 0, 0);
    }
};
