/**
 * 다녀온 곳을 세계지도 위에 그린다.
 *
 * 대륙은 src/worldmap.js 의 윤곽(Natural Earth 공공 도메인)을 옅게 깔고, 그 위에
 * 대권 항로와 도시 점을 얹는다. 나라 경계는 담지 않았다. 크루가 보는 건 결국
 * "어디에서 어디로 얼마나" 라서, 대륙 모양이면 어디쯤인지 읽히기 때문이다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./geo.js'), require('./worldmap.js'));
  } else {
    root.CrewCal = root.CrewCal || {};
    root.CrewCal.mapdraw = factory(root.CrewCal.geo, root.CrewCal.worldmap);
  }
})(typeof self !== 'undefined' ? self : this, function (geo, worldmap) {
  'use strict';

  var FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  /** 점 크기: 많이 간 곳일수록 크게, 다만 한없이 커지지는 않게. */
  /** 글자색을 옅게 만든다. 화면이 밝든 어둡든 바탕에 맞춰 따라간다. */
  function faded(color, alpha) {
    var hex = /^#([0-9a-f]{6})$/i.exec(String(color).trim());
    if (hex) {
      var n = parseInt(hex[1], 16);
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }
    var rgb = /rgba?\(([^)]+)\)/i.exec(String(color));
    if (rgb) {
      var parts = rgb[1].split(',');
      return 'rgba(' + parts[0].trim() + ',' + parts[1].trim() + ',' + parts[2].trim() + ',' + alpha + ')';
    }
    return color;
  }

  function dotRadius(count, max) {
    var base = 3.2;
    if (!count) return base;
    var ratio = max > 1 ? (count - 1) / (max - 1) : 1;
    return base + Math.sqrt(ratio) * 6.5;
  }

  /** 이름을 붙일 도시. 너무 많으면 지도가 글자로 덮인다. */
  function labelled(places, limit) {
    return places.slice(0, limit || 14);
  }

  /**
   * 육지 고리 하나를 화면 자리로 편다.
   *
   * 지도 한가운데를 옮겨 두면 어떤 대륙은 지도 양 끝에 걸친다. 경도를 접지 않고
   * 이어진 값으로 편 뒤 지도 너비만큼 좌우로 밀어 세 번 그리면, 걸친 대륙도
   * 끊기지 않고 양쪽에 제대로 나온다.
   */
  function landPath(ring, box) {
    var top = box.top == null ? 80 : box.top;
    var bottom = box.bottom == null ? -52 : box.bottom;
    var center = box.center || 0;
    var points = [];
    var prev = null;
    for (var i = 0; i < ring.length; i++) {
      var lon = ring[i].lon - center;
      if (prev !== null) {
        while (lon - prev > 180) lon -= 360;
        while (prev - lon > 180) lon += 360;
      }
      prev = lon;
      points.push({
        x: ((lon + 180) / 360) * box.width,
        y: ((top - ring[i].lat) / (top - bottom)) * box.height
      });
    }
    return points;
  }

  /** 대륙을 옅게 깔아 어디쯤인지 알아보게 한다. */
  function drawLand(ctx, box, fill, edge) {
    if (!worldmap) return 0;
    var drawn = 0;
    worldmap.rings().forEach(function (ring) {
      var points = landPath(ring, box);
      var minX = Infinity, maxX = -Infinity;
      points.forEach(function (p) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      });
      [-box.width, 0, box.width].forEach(function (shift) {
        if (maxX + shift < 0 || minX + shift > box.width) return;   // 화면 밖
        ctx.beginPath();
        points.forEach(function (p, i) {
          if (i === 0) ctx.moveTo(p.x + shift, p.y);
          else ctx.lineTo(p.x + shift, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        drawn++;
      });
    });
    return drawn;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  /** 점 둘레에서 빈 자리를 찾는다. 오른쪽부터 보고, 다 막혔으면 안 쓴다. */
  function freeSpot(taken, xy, r, w, width, height) {
    var gap = r + 5;
    var tries = [
      { x: xy.x + gap, y: xy.y },
      { x: xy.x - gap - w, y: xy.y },
      { x: xy.x - w / 2, y: xy.y - gap - 8 },
      { x: xy.x - w / 2, y: xy.y + gap + 8 },
      { x: xy.x + gap, y: xy.y - 18 },
      { x: xy.x - gap - w, y: xy.y + 18 }
    ];
    for (var i = 0; i < tries.length; i++) {
      var spot = tries[i];
      if (spot.x < 4 || spot.x + w > width - 4) continue;
      if (spot.y < 14 || spot.y > height - 14) continue;
      var rect = { x: spot.x - 2, y: spot.y - 10, w: w + 4, h: 20 };
      var clash = taken.some(function (other) { return overlaps(rect, other); });
      if (!clash) return spot;
    }
    return null;
  }

  function draw(canvas, options) {
    var opts = options || {};
    var data = opts.data || { legs: [], places: [], totals: {} };
    var color = opts.colors || {};
    var width = opts.width || 1080;
    var height = opts.height || Math.round(width * 0.62);
    var scale = opts.scale || 2;

    canvas.width = width * scale;
    canvas.height = height * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.textBaseline = 'middle';

    var ink = color.text || '#221f1a';
    var faint = color.faint || 'rgba(72,66,54,0.34)';
    var line = color.line || 'rgba(72,66,54,0.15)';
    var accent = color.accent || '#33456e';
    var bg = color.bg || '#f7f5f1';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 한국을 가운데에 둔다. 크루가 뜨는 곳이 한국이라, 태평양 노선이 잘리지 않는다.
    var center = opts.center == null ? 150 : opts.center;
    var box = { width: width, height: height, top: 80, bottom: -52, center: center };

    // 머리말은 자리만 미리 잡아 둔다. 항로에 덮이지 않게 맨 나중에 그린다.
    var head = [];
    if (opts.title) head.push({ text: opts.title, font: '700 26px ' + FONT, color: ink, y: 30 });
    if (opts.subtitle) head.push({ text: opts.subtitle, font: '500 17px ' + FONT, color: color.muted || faint, y: 56 });

    // 대륙
    ctx.save();
    ctx.globalAlpha = 1;
    drawLand(ctx, box, color.land || faded(ink, 0.11), color.landEdge || faded(ink, 0.22));
    ctx.restore();

    // 위·경도 눈금
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (var lon = -180; lon <= 180; lon += 30) {
      var p = geo.project({ lat: 0, lon: lon }, box);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, height);
      ctx.stroke();
    }
    for (var lat = -60; lat <= 75; lat += 15) {
      var q = geo.project({ lat: lat, lon: 0 }, box);
      ctx.beginPath();
      ctx.moveTo(0, q.y);
      ctx.lineTo(width, q.y);
      ctx.stroke();
    }
    // 적도는 조금 진하게
    var eq = geo.project({ lat: 0, lon: 0 }, box);
    ctx.strokeStyle = faint;
    ctx.beginPath();
    ctx.moveTo(0, eq.y);
    ctx.lineTo(width, eq.y);
    ctx.stroke();

    // 항로
    var busiest = data.legs.reduce(function (m, l) { return Math.max(m, l.count); }, 1);
    data.legs.forEach(function (leg) {
      var from = geo.coordOf(leg.from);
      var to = geo.coordOf(leg.to);
      if (!from || !to) return;
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.22 + 0.5 * (leg.count / busiest);
      ctx.lineWidth = 1 + 2 * (leg.count / busiest);
      ctx.lineCap = 'round';
      geo.arc(from, to, 48, center).forEach(function (piece) {
        ctx.beginPath();
        piece.forEach(function (point, i) {
          var xy = geo.project(point, box);
          if (i === 0) ctx.moveTo(xy.x, xy.y);
          else ctx.lineTo(xy.x, xy.y);
        });
        ctx.stroke();
      });
    });
    ctx.globalAlpha = 1;

    // 도시 점
    var most = data.places.reduce(function (m, p) { return Math.max(m, p.count); }, 1);
    data.places.forEach(function (place) {
      var c = geo.coordOf(place.iata);
      if (!c) return;
      var xy = geo.project(c, box);
      var r = dotRadius(place.count, most);
      ctx.beginPath();
      ctx.arc(xy.x, xy.y, r, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = bg;
      ctx.stroke();
    });

    // 집. 다 여기서 뜨고 여기로 돌아오니 따로 표시한다.
    var taken = [];
    head.forEach(function (row) {
      ctx.font = row.font;
      row.width = ctx.measureText(row.text).width;
      taken.push({ x: 20, y: row.y - 14, w: row.width + 12, h: 28 });
    });
    if (opts.home !== false) {
      var home = geo.coordOf(opts.home || 'ICN');
      if (home) {
        var hxy = geo.project(home, box);
        ctx.beginPath();
        ctx.arc(hxy.x, hxy.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = ink;
        ctx.stroke();
        taken.push({ x: hxy.x - 8, y: hxy.y - 8, w: 16, h: 16 });
      }
    }

    // 도시 이름. 겹치면 자리를 옮겨 보고, 그래도 겹치면 이름을 접는다.
    ctx.font = '600 14px ' + FONT;
    labelled(data.places, opts.labels).forEach(function (place) {
      var c = geo.coordOf(place.iata);
      if (!c) return;
      var xy = geo.project(c, box);
      var r = dotRadius(place.count, most);
      var text = place.city + (place.count > 1 ? ' ' + place.count : '');
      var w = ctx.measureText(text).width;
      var spot = freeSpot(taken, xy, r, w, width, height);
      if (!spot) return;
      taken.push({ x: spot.x - 2, y: spot.y - 10, w: w + 4, h: 20 });

      // 글자 뒤에 바탕을 깔아 선 위에서도 읽히게 한다
      ctx.textAlign = 'left';
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = bg;
      ctx.fillRect(spot.x - 3, spot.y - 9, w + 6, 18);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.fillText(text, spot.x, spot.y);
    });

    // 머리말. 그림으로 저장했을 때 이 한 줄만 봐도 무슨 그림인지 알게 한다.
    ctx.textAlign = 'left';
    head.forEach(function (row) {
      ctx.font = row.font;
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = bg;
      ctx.fillRect(20, row.y - 13, row.width + 10, 26);
      ctx.globalAlpha = 1;
      ctx.fillStyle = row.color;
      ctx.fillText(row.text, 24, row.y);
    });

    // 바닥말
    ctx.textAlign = 'right';
    ctx.font = '500 14px ' + FONT;
    ctx.fillStyle = faint;
    ctx.fillText(opts.footer || '크루캘', width - 24, height - 20);

    return { width: width, height: height };
  }

  return {
    draw: draw,
    dotRadius: dotRadius,
    labelled: labelled,
    freeSpot: freeSpot,
    landPath: landPath,
    faded: faded
  };
});
