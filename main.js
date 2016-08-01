(function () {

  "use strict";

  // Initialize Quintus with our required modules.
  var Q = Quintus({audioSupported: ['wav']})
    .include('Sprites, Scenes, Input, 2D, Touch, Anim, Audio')
    .setup({width: 1024, height: 768, maximize: true})
    .controls()
    .touch()
    .enableSound();

  Q.input.keyboardControls({
    65: 'mleft',
    68: 'mright',
    87: 'mup',
    13: 'enter'
  });

  Q.component('platformerControlsAlt', {
    defaults: {
      speed: 200,
      jumpSpeed: -300,
      collisions: []
    },

    added: function () {
      var p = this.entity.p;

      Q._defaults(p, this.defaults);

      this.entity.on('step', this, 'step');
      this.entity.on('bump.bottom', this, 'landed');

      p.landed = 0;
      p.direction = 'right';
    },

    landed: function () {
      var p = this.entity.p;
      p.landed = 1 / 5;
    },

    step: function (dt) {
      var p = this.entity.p, collision, i;

      if (p.ignoreControls === undefined || !p.ignoreControls) {
        // Follow along the current slope, if possible.
        if (p.collisions !== undefined && p.collisions.length > 0 && (Q.inputs.mleft || Q.inputs.mright || p.landed > 0)) {
          if (p.collisions.length === 1) {
            collision = p.collisions[0];
          } else {
            // If there's more than one possible slope, follow slope with negative Y normal
            collision = null;

            for (i = 0; i < p.collisions.length; i += 1) {
              if (p.collisions[i].normalY < 0) {
                collision = p.collisions[i];
              }
            }
          }

          // Don't climb up walls.
          if (collision !== null && collision.normalY > -0.3 && collision.normalY < 0.3) {
            collision = null;
          }
        }

        if (Q.inputs.mleft) {
          p.direction = 'mleft';
          if (collision && p.landed > 0) {
            p.vx = p.speed * collision.normalY;
            p.vy = -p.speed * collision.normalX;
          } else {
            p.vx = -p.speed;
          }
        } else if (Q.inputs.mright) {
          p.direction = 'mright';
          if (collision && p.landed > 0) {
            p.vx = -p.speed * collision.normalY;
            p.vy = p.speed * collision.normalX;
          } else {
            p.vx = p.speed;
          }
        } else {
          p.vx = 0;
          if (collision && p.landed > 0) {
            p.vy = 0;
          }
        }

        if (p.landed > 0 && (Q.inputs.mup || Q.inputs.maction) && !p.jumping) {
          p.vy = p.jumpSpeed;
          p.landed = -dt;
          p.jumping = true;
        } else if (Q.inputs.mup || Q.inputs.mAction) {
          this.entity.trigger('jump', this.entity);
          p.jumping = true;
        }

        if (p.jumping && !(Q.inputs.mup || Q.inputs.maction)) {
          p.jumping = false;
          this.entity.trigger('jumped', this.entity);
          if (p.vy < p.jumpSpeed / 3) {
            p.vy = p.jumpSpeed / 3;
          }
        }
      }
      p.landed -= dt;
    }
  });

  // Defines animations used by our sprites. In a larger game I would have
  // stored this information in JSON as Javascript isn't needed here.
  Q.animations('switch', {
    on: {frames: [1], rate: 1 / 3},
    off: {frames: [0], rate: 1 / 3}
  });

  Q.animations('boombox', {
    playing: {frames: [0, 1], rate: 1 / 3}
  });

  Q.animations('vent_air', {
    on: {frames: [0, 1], rate: 1 / 3},
    off: {frames: [0], rate: 1 / 3}
  });

  Q.animations('unipiper', {
    left: {frames: [0, 1], rate: 1 / 3},
    right: {frames: [2, 3], rate: 1 / 3}
  });

  Q.animations('sam', {
    run_right: {frames: [0, 1, 2, 3], rate: 1 / 4},
    run_left: {frames: [4, 5, 6, 7], rate: 1 / 4},
    stand_right: {frames: [0], rate: 1 / 5},
    stand_left: {frames: [4], rate: 1 / 5}
  });

  Q.animations('mykal', {
    run_right: {frames: [0, 1], rate: 1 / 4},
    run_left: {frames: [2, 3], rate: 1 / 4},
    stand_right: {frames: [0], rate: 1 / 5},
    stand_left: {frames: [2], rate: 1 / 5}
  });

  Q.animations('mykal_push', {
    playing: {frames: [0, 1], rate: 1 / 2}
  });

  Q.animations('sam_push', {
    playing: {frames: [0, 1], rate: 1 / 2}
  });

  Q.animations('firework', {
    boom: {frames: [0, 1, 3, 4, 5, 6, 7, 8, 9, 10], rate: 1 / 5, loop: false, trigger: 'animation_finished'}
  });

  Q.Sprite.extend('Unipiper', {
    init: function (p) {
      this._super(p, {
        sheet: 'unipiper',
        sprite: 'unipiper',
        x: 4400,
        y: 300,
        x_bound: [4224, 4516],
        vx: -600,
        points: [[-20, -45], [20, -45], [20, 45], [-20, 45]],
        direction: -1
      });

      this.add('2d');
      this.add('animation');

      // Make sure the Unipiper continues rolling around if a player
      // collides with him. In a game with death, this would decrease life.
      this.on('bump.left', function (collision) {
        if (collision.obj.isA('Sam') || collision.obj.isA('Mykal')) {
          collision.obj.p.x -= 5;
        }
      });

      this.on('bump.right', function (collision) {
        if (collision.obj.isA('Sam') || collision.obj.isA('Mykal')) {
          collision.obj.p.x += 5;
        }
      });

      this.play('left');
    },

    // The Unipiper bounces back and forth on his platform to make it tough
    // for players to get past him.
    step: function () {
      if (this.p.x <= this.p.x_bound[0]) {
        this.p.direction = 1;
      } else if (this.p.x >= this.p.x_bound[1]) {
        this.p.direction = -1;
      }
      this.p.vx = 400 * this.p.direction;
      if (this.p.vx < 0) {
        this.play('left');
      } else {
        this.play('right');
      }
    }
  });

  // Step function for players. For the most part, this only controls animation
  // and respawn scenarios.
  function playerStep () {
    var closest, distance, i;
    if (this.p.vx > 0) {
      this.stage.follow(this);
      this.play('run_right');
    } else if (this.p.vx < 0) {
      this.stage.follow(this);
      this.play('run_left');
    } else {
      this.play('stand_' + this.p.direction.replace('m', ''));
    }

    // Check if we need to be re-spawned (2000px is well off the map).
    if (this.p.y > 2000) {
      // Loop through the stages pre-defined respawn points and find the
      // one closest to the players last resting position.
      closest = false;
      for (i in this.stage.respawn_points) {
        if (this.stage.respawn_points.hasOwnProperty(i)) {
          distance = this.p.last_coord[0] - this.stage.respawn_points[i][0];
          if (!closest || (distance < closest[1] && distance >= 0)) {
            closest = [i, distance];
          }
        }
      }
      // Respawn the player. In a big game you could take a life away too.
      this.p.vx = 0;
      this.p.vy = 0;
      this.p.x = this.stage.respawn_points[closest[0]][0];
      this.p.y = this.stage.respawn_points[closest[0]][1];
    } else if (this.p.vy === 0 && this.p.vx === 0) {
      // If the player is completely stopped, save their position. This
      // prevents dirty cheaters from jumping off cliffs and being rewarded by
      // respawning on the other side.
      this.p.last_coord = [this.p.x, this.p.y];
    }
  }

  Q.Sprite.extend('Sam', {
    init: function (p) {
      this._super(p, {
        sheet: 'sam',
        sprite: 'sam',
        x: 96,
        y: 650,
        points: [[-20, -45], [20, -45], [20, 45], [-20, 45]],
        speed: 300,
        jumpSpeed: -500,
        last_jump: false
      });
      this.add('2d, platformerControls, animation');
      this.p.direction = 'left';

      // Play a sound when Sam jumps, but don't stack Q.audio.play() calls.
      // In theory, Q.audio.play can detect and prevent this too, but it never
      // worked for me. :-O
      this.on('jump', function () {
        if (this.p.vy <= -480 && ((Date.now() - this.p.last_jump) > 500 || !this.p.last_jump)) {
          Q.audio.play('sam_jump.wav', 500);
          this.p.last_jump = Date.now();
        }
      });
    },

    step: playerStep
  });

  Q.Sprite.extend('Mykal', {
    init: function (p) {
      this._super(p, {
        sheet: 'mykal',
        sprite: 'mykal',
        x: 0,
        y: 650,
        points: [[-28, -40], [28, -40], [28, 48], [-28, 48]],
        speed: 300,
        jumpSpeed: -500,
        last_jump: false
      });
      // "platformerControlsAlt" is a clone of "platformerControls", with
      // WASD support.
      this.add('2d, platformerControlsAlt, animation');

      this.on('jump', function () {
        if (this.p.vy <= -480 && ((Date.now() - this.p.last_jump) > 500 || !this.p.last_jump)) {
          Q.audio.play('mykal_jump.wav', 500);
          this.p.last_jump = Date.now();
        }
      });
    },

    step: playerStep
  });

  // The "Bridge" sprite is controlled by two triggers players must press in
  // turns to cross it as a couple.
  Q.Sprite.extend('Bridge', {
    init: function (p) {
      this._super(p, {
        sheet: 'bridge',
        sprite: 'bridge',
        x: 820,
        y: 266,
        angle: 90,
        pressed: false
      });
      this.add('2d', 'animation');

      this.on('trigger.press', function () {
        this.animate({x: 1040, angle: 180});
        this.pressed = true;
      });
    },

    step: function () {
      if (!this.pressed) {
        this.animate({x: 820, angle: 90});
      }
      this.pressed = false;
    }
  });

  // The coffee cup is a static object players jump onto.
  Q.Sprite.extend('Coffee', {
    init: function (p) {
      this._super(p, {
        sheet: 'coffee',
        sprite: 'coffee',
        x: 3360,
        y: 550,
        points: [[39, 144], [-39, 144], [-78, -144], [78, -144]]
      });
    }
  });

  // The sign is just visual and points players towards brunch.
  Q.Sprite.extend('Sign', {
    init: function (p) {
      this._super(p, {
        sheet: 'sign',
        sprite: 'sign',
        x: 5550,
        y: 625,
        sensor: true
      });
    }
  });

  // The brunch building is also just for visuals, but does not allow clipping.
  Q.Sprite.extend('Brunch', {
    init: function (p) {
      this._super(p, {
        sheet: 'brunch',
        sprite: 'brunch',
        x: 6900,
        y: 300
      });
      this.add('2d');
    }
  });

  // The church sits at the end of the map and is just visual.
  Q.Sprite.extend('Church', {
    init: function (p) {
      this._super(p, {
        sheet: 'church',
        sprite: 'church',
        x: 8300,
        y: 371,
        sensor: true
      });
    }
  });

  // The start screen is the only sprite in the first stage.
  Q.Sprite.extend('Start', {
    init: function (p) {
      var scale = 1;
      if (Q.width < 1024) {
        scale = Q.width / 1024;
      }
      this._super(p, {
        sheet: 'start',
        sprite: 'start',
        x: Q.width / 2,
        y: Q.height / 2,
        scale: scale,
        sensor: true
      });
    }
  });

  // The end screen is a sign that floats up the stage on top of the church.
  Q.Sprite.extend('End', {
    init: function (p) {
      this._super(p, {
        sheet: 'end',
        sprite: 'end',
        x: 8350,
        y: -300,
        sensor: true
      });
    },

    step: function () {
      if (this.p.y < 1050) {
        this.p.y += 1;
      }
    }
  });

  // The "Push" sprites are just visual indicators of what actoin players
  // have to take at different points in the game.
  Q.Sprite.extend('SamPush', {
    init: function (p) {
      this._super(p, {
        sheet: 'sam_push',
        sprite: 'sam_push',
        x: 5250,
        y: 450,
        sensor: true
      });
      this.add('animation');
      this.play('playing');
    }
  });

  Q.Sprite.extend('MykalPush', {
    init: function (p) {
      this._super(p, {
        sheet: 'mykal_push',
        sprite: 'mykal_push',
        x: 2800,
        y: 200,
        sensor: true
      });
      this.add('animation');
      this.play('playing');
    }
  });

  // The pastry sprite is a ramp that players move around and use to climb on
  // top of the coffee cup. It's a bit tricky as we want players to be able to
  // push it, but also walk on it without it moving around.
  Q.Sprite.extend('Pastry', {
    init: function (p) {
      this._super(p, {
        sheet: 'pastry',
        sprite: 'pastry',
        x: 3000,
        y: 100,
        points: [[-96, 96], [-96, 0], [96, -96], [96, 96]]
      });
      this.add('2d');

      this.on('bump.left', function (collision) {
        // Make sure we're not also bump'in top.
        if ((collision.obj.p.y - this.p.y) > 0 && this.p.x <= 3200) {
          this.p.x += 1;
        }
      });

      this.on('bump.right', function (collision) {
        // Make sure we're not also bump'in top.
        if ((collision.obj.p.y - this.p.y) > 0 && this.p.x <= 3200) {
          this.p.x -= 1;
        }
      });
    }
  });

  // The boombox is pushed to help Mykal up to the hipster area of the map.
  Q.Sprite.extend('Boombox', {
    init: function (p) {
      this._super(p, {
        sheet: 'boombox',
        sprite: 'boombox',
        x: 5200,
        y: 500
      });
      this.add('2d');
      this.add('animation');

      this.on('bump.right', function (collision) {
        // Make sure we're not also bump'in top.
        if ((collision.obj.p.y - this.p.y) > 0) {
          this.p.x -= 1;
        }
      });

      this.play('playing');
    }
  });

  // Hipsters bounce in place and change direction every now and then, letting
  // Sam and Mykal bounce on their heads as they wait in line for brunch.
  Q.Sprite.extend('Hipster', {
    init: function (p) {
      this._super(p, {
        sheet: 'hipster_01',
        sprite: 'hipster_01',
        x: 5600,
        y: 100
      });
      this.add('2d');

      this.on('bump.top', function (collision) {
        collision.obj.p.vy = -730;
        collision.obj.p.y -= 5;
        if (collision.obj.isA('Mykal') || collision.obj.isA('Sam')) {
          Q.audio.play('stomp.wav', {debounce: 500});
        }
      });
    },

    step: function () {
      if (this.p.vy === 0) {
        this.p.vy = -300;
        this.p.flip = Math.random() >= 0.5 ? 'x' : false;
      }
    }
  });

  // The triggers are buttons that lower the Bridge sprite down so that a
  // player can cross to the other side. You can set their "target" property
  // to any other sprite to have an event triggered when pressed.
  Q.Sprite.extend('Trigger', {
    init: function (p) {
      this._super(p, {
        sheet: 'switch',
        sprite: 'switch',
        x: 600,
        y: 650,
        points: [[-48, 36], [48, 36], [48, 48], [-48, 48]],
        active: false,
        state: false
      });
      this.add('2d');
      this.add('animation');

      this.on('bump.top', function (collision) {
        if (collision.obj.isA('Mykal') || collision.obj.isA('Sam')) {
          this.target.trigger('trigger.press');
          if (!this.p.state) {
            Q.audio.play('trigger.wav');
            this.p.state = true;
            this.play('on');
          }
          this.p.active = true;
        }
      });

      this.play('off');
    },

    step: function () {
      if (!this.p.active) {
        this.p.state = false;
        this.play('off');
      }
      this.p.active = false;
    }
  });

  // The air vent shoots Mykal up to the clouds, but Sam gets no lift.
  Q.Sprite.extend('VentAir', {
    init: function (p) {
      this._super(p, {
        sheet: 'vent_air',
        sprite: 'vent_air',
        x: 2350,
        y: 620,
        points: [[-50, 49], [50, 49], [50, 50], [-50, 50]],
        power: 1000,
        active: false,
        state: false
      });

      this.add('2d');
      this.add('animation');

      // This logic blows.
      this.on('bump.top', function (collision) {
        if (collision.obj.isA('Mykal')) {
          collision.obj.p.vy = this.p.power * -1;
          if (!this.p.state) {
            Q.audio.play('vent.wav');
            this.p.state = true;
          }
          this.p.active = true;
        }
      });

      this.play('on');
    },

    step: function () {
      if (!this.p.active) {
        this.p.state = false;
      }
      this.p.active = false;
    }

  });

  // Fireworks explode whereever you place them, playing a sound and moving to
  // new location after their animation is complete. There's a bit of stupid
  // random logic thrown in to prevent the firework clusters from looking fake.
  Q.Sprite.extend('Firework', {
    init: function (p) {
      var x = Math.floor(Math.random() * 700) + 8000,
        y = Math.floor(Math.random() * 500),
        self = this;
      this._super(p, {
        sheet: 'firework',
        sprite: 'firework',
        x: x,
        y: y,
        sensor: true
      });

      this.add('animation');

      setTimeout(function () { self.play('boom'); }, Math.floor(Math.random() * 200));

      this.on('animation_finished', function () {
        this.p.x = Math.floor(Math.random() * 800) + 8000;
        this.p.y = Math.floor(Math.random() * 500) - 200;
        this.play('boom');
        var is_playing = false, i;
        for (i in Q.audio.playingSounds) {
          if (Q.audio.playingSounds.hasOwnProperty(i)) {
            if (Q.audio.playingSounds[i].assetName === 'firework.wav') {
              is_playing = true;
            }
          }
        }
        if (!is_playing) {
          Q.audio.play('firework.wav', 500);
        }
      });
    }

  });

  // This sprite is a text bubble that follows the current player around with
  // contextual information about the game.
  Q.Sprite.extend('Text', {
    init: function (p) {
      this._super(p, {
        sheet: 'text',
        sprite: 'text',
        sensor: true,
        x: 0,
        y: 0,
        triggers: [288, 2300, 4800, 5600, 8000],
        trigger: 0,
        hidden: true,
        frame: 0,
        timeout: 200
      });
    },

    step: function () {
      var target = this.stage.viewport.following.p;
      if (this.p.hidden && this.p.triggers.length > 0) {
        if (target.x >= this.p.triggers[this.p.trigger]) {
          this.p.frame = this.p.trigger;
          this.p.hidden = false;
          this.p.trigger += 1;
        }
      } else if (this.p.timeout <= 0) {
        this.p.timeout = 200;
        this.p.hidden = true;
      } else {
        this.p.timeout -= 1;
      }
      this.p.x = target.x;
      this.p.y = target.y - 96;
    }
  });

  // The start screen just displays an image and waits for the player to start.
  Q.scene('start', function (stage) {
    stage.insert(new Q.Start());
  });

  // The main stage. This logic is mostly just placing sprites on screen. 
  Q.scene('main', function (stage) {
    var bridge, trigger1, trigger2, i, sam, hipster, sprite;
    // Display a solid color background and a Portland-inspired skyline.
    stage.insert(new Q.Repeater({asset: 'background_empty.png', speedX: 0.5, speedY: 0.5, type: 0}));
    stage.insert(new Q.Repeater({asset: 'background.png', speedX: 0.5, speedY: 0.5, type: 0, repeatY: false}));

    // The only tile map we use is for collision, which is pretty basic.
    stage.collisionLayer(new Q.TileLayer({
      dataAsset: 'level.json',
      sheet: 'tiles',
      tileW: '96',
      tileH: '96'
    }));

    // Add all the sprites. I think ideally this would be done in another tile
    // map, so that adding duplicate sprites would be easy and this file would
    // contain no static X/Y values, which is currently has a ton of.
    bridge = new Q.Bridge().add('tween');
    trigger1 = new Q.Trigger();
    trigger2 = new Q.Trigger();
    trigger2.p.x = 1400;
    sam = new Q.Sam();

    trigger1.target = bridge;
    trigger2.target = bridge;

    stage.insert(new Q.SamPush());
    stage.insert(new Q.MykalPush());
    stage.insert(new Q.Brunch());
    stage.insert(new Q.Sign());
    stage.insert(new Q.Church());
    stage.insert(sam);
    stage.insert(new Q.Mykal());
    stage.insert(bridge);
    stage.insert(trigger1);
    stage.insert(trigger2);
    stage.insert(new Q.Coffee());
    stage.insert(new Q.Pastry());
    stage.insert(new Q.Boombox());
    stage.insert(new Q.Text());

    stage.insert(new Q.VentAir());

    stage.insert(new Q.Unipiper());

    // Add some random hipsters to the brunch line.
    for (i = 1; i <= 20; i += 1) {
      hipster = new Q.Hipster();
      sprite = Math.floor(Math.random() * 4) + 1;
      hipster.p.x = 5600 + (i * 50);
      hipster.p.sprite = hipster.p.sheet = 'hipster_0' + sprite;
      stage.insert(hipster);
    }

    // Follow me first. I'm biased! Whoever presses a key first moves first
    // though, don't worry.
    stage.add('viewport').follow(sam);

    // This is a map of "safe" spawn locations. When a player stands still,
    // their position is recorded and the next time they fall, they are placed
    // at the nearest respawn point (as long as it's behind them).
    stage.respawn_points = [
      [0, 96],
      [700, 96],
      [1152, 96],
      [3360, 192],
      [3840, 96],
      [8000, 96]
    ];

    // Play our background music. Thank you https://soundcloud.com/eric-skiff!
    Q.audio.play('Jumpshot.wav', {loop: 1});
  });

  // Load all of our static assets. Woah we have a lot of these! If this was a
  // production game I would have used sprite sheets.
  Q.load(['cross.png', 'sam.png', 'mykal.png', 'level.json', 'tiles.png',
    'bridge.png', 'switch.png', 'background.png', 'background_empty.png',
    'vent_air.png', 'coffee.png', 'mykal_jump.wav', 'sam_jump.wav', 'vent.wav',
    'trigger.wav', 'unipiper.png', 'start.png', 'boombox.png',
    'hipster_01.png', 'hipster_02.png', 'hipster_03.png', 'hipster_04.png',
    'stomp.wav', 'text.png', 'brunch_sign.png', 'brunch.png', 'church.png',
    'firework.png', 'complete.wav', 'firework.wav', 'end.png', 'Jumpshot.wav',
    'mykal_push.png', 'sam_push.png'],
    function () {
      // Remove loading element.
      document.body.removeChild(document.getElementById('loading'));

      Q.sheet('sam', 'sam.png', {tilew: 96, tileh: 96});
      Q.sheet('mykal', 'mykal.png', {tilew: 96, tileh: 96});
      Q.sheet('mykal_push', 'mykal_push.png', {tilew: 96, tileh: 96});
      Q.sheet('sam_push', 'sam_push.png', {tilew: 96, tileh: 96});
      Q.sheet('tiles', 'tiles.png', {tilew: 96, tileh: 96});
      Q.sheet('switch', 'switch.png', {tilew: 96, tileh: 96});
      Q.sheet('bridge', 'bridge.png', {tilew: 480, tileh: 96});
      Q.sheet('vent_air', 'vent_air.png', {tilew: 96, tileh: 96});
      Q.sheet('unipiper', 'unipiper.png', {tilew: 96, tileh: 96});
      Q.sheet('coffee', 'coffee.png', {tilew: 156, tileh: 288});
      Q.sheet('pastry', 'cross.png', {tilew: 192, tileh: 192});
      Q.sheet('boombox', 'boombox.png', {tilew: 96, tileh: 96});
      Q.sheet('hipster_01', 'hipster_01.png', {tilew: 40, tileh: 94});
      Q.sheet('hipster_02', 'hipster_02.png', {tilew: 45, tileh: 87});
      Q.sheet('hipster_03', 'hipster_03.png', {tilew: 48, tileh: 81});
      Q.sheet('hipster_04', 'hipster_04.png', {tilew: 48, tileh: 96});
      Q.sheet('text', 'text.png', {tilew: 96, tileh: 96});
      Q.sheet('sign', 'brunch_sign.png', {tilew: 96, tileh: 96});
      Q.sheet('brunch', 'brunch.png', {tilew: 384, tileh: 384});
      Q.sheet('church', 'church.png', {tilew: 384, tileh: 603});
      Q.sheet('firework', 'firework.png', {tilew: 96, tileh: 96});
      Q.sheet('end', 'end.png', {tilew: 960, tileh: 500});
      Q.sheet('start', 'start.png', {tilew: 1024, tileh: 768});

      var start_stage = Q.stageScene('start');
      start_stage.on('step', function () {
        // If the user presses "enter", start the next stage!
        if (Q.inputs.enter) {
          var main_stage = Q.stageScene('main'),
            delay = 200,
            fireworks = false;
          // Our stage logic is really simple, we basically just check to see
          // if the user is at the end of the stage and play the closing
          // credits if so. This seems messy because I had to finish the game
          // quick and start actually planning the wedding!
          main_stage.on('step', function () {
            if (this.viewport.centerX > 7900 || this.viewport.scale < 1) {
              if (this.viewport.scale > 0.5) {
                if (!delay) {
                  this.viewport.scale -= 0.01;
                } else {
                  delay -= 1;
                }
              } else if (!fireworks) {
                this.insert(new Q.Firework());
                this.insert(new Q.Firework());
                this.insert(new Q.Firework());
                this.insert(new Q.Firework());
                fireworks = true;

                // Stop playing the main music.
                Q.audio.stop('Jumpshot.wav');

                // Play the classic ending music.
                Q.audio.play('complete.wav');

                // Insert a splash screen to RSVP.
                this.insert(new Q.End());
              } else {
                if (Q.inputs.enter) {
                  Q.stage().pause();
                  window.location.href = 'rsvp';
                }
              }
            }
          });
        }
      });
    }, {
      // We use a really simple HTML loading bar to track progress.
      progressCallback: function (loaded, total) {
        var element = document.getElementById('loading-progress');
        element.style.width = Math.floor(loaded / total * 100) + '%';
      }
    });

}());
