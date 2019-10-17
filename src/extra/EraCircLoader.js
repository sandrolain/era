(function()
{

	class EraCircLoader
	{
		constructor (options)
		{
			this.width		= options.width || options.height || 100;
			this.height		= options.height || options.width || 100;
			this.innerRadius= options.innerRadius || 0;
			this.radius		= options.radius || Math.min(this.width, this.height) / 2;
			this.left		= (this.width - (this.radius * 2)) / 2;
			this.top		= (this.height - (this.radius * 2)) / 2;
			this.cx			= this.width / 2;
			this.cy			= this.height / 2;
			this.reverse	= options.reverse;
			this.offset		= options.offset || 0;
			this.bgStyle	= options.backgroundColor;
			this.fillStyle	= options.fillStyle || options.color || '#000000';
			this._value		= options.value || 0;
			this.image		= options.image;

			if(this.image)
			{
				var that	= this;
				var $img	= new Image();

				$img.onload = function()
				{
					this.onload = null;

					that.$img = $img;
				};

				$img.src = this.image;
			}

			this.$target	= Era.DOM.getQueryRoot(options.target);

			this.$canvas	= Era.DOM.nodeFrom(['canvas', {
				width: this.width,
				height: this.height
			}], this.$target);

			this.ctx		= this.$canvas.getContext('2d');

			this.ctx.webkitImageSmoothingEnabled	= true;
			this.ctx.imageSmoothingEnabled			= true;

			this.draw();
		}

		draw()
		{
			var ctx = this.ctx;

			if(this.offset === 'inverse')
			{
				var offset = 90 + ( (this._value * 360)) / -2;
			}
			else if(this.offset === true)
			{
				var offset = -90 + ( (this._value * 360)) / -2;
			}
			else
			{
				var offset	= -90 + (this.offset * 360);
			}

			var angle = Era.Math.rad((this._value * 360) + offset);
			var start = Era.Math.rad(offset);


			ctx.save();

			ctx.clearRect(0, 0, this.width, this.height);


			// creo lo asonfo se esiste
			if(this.bgStyle)
			{
				ctx.fillStyle = this.bgStyle;

				ctx.beginPath();

				ctx.arc(this.cx, this.cy, this.innerRadius, Math.PI * 2, 0, !this.reverse);
				ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2, !!this.reverse);

				ctx.closePath();

				ctx.fill();
			}

			ctx.restore();


			if(this.image)
			{
				if(this.$img)
				{
					ctx.drawImage(this.$img, 0, 0);
				}

				ctx.fillStyle = '#FFF'; //color doesn't matter, but we want full opacity
				ctx.globalCompositeOperation = 'destination-in';
			}
			else
			{
				ctx.fillStyle = this.fillStyle;
			}

			ctx.beginPath();

			ctx.arc(this.cx, this.cy, this.innerRadius, angle, start, !this.reverse);
			//ctx.lineTo(this.cx, this.cy - this.radius);
			ctx.arc(this.cx, this.cy, this.radius, start, angle, !!this.reverse);

			ctx.closePath();

			ctx.fill();

			ctx.restore();
		}

		setColor(style)
		{
			this.fillStyle = style || "#000000";
		}

		setValue(val)
		{
			var oldValue = this._value;

			if(Era.is(val))
			{
				this._value = val;

				this.draw();
			}

			return oldValue;
		}
	}

	Era.CircLoader = EraCircLoader;

	if(typeof module != "undefined")
	{
		module.exports = EraCircLoader;
	}

})();