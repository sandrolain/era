(function()
{
	class EraScrollAnimation
	{
		static init(opts = {})
		{
			if(this.initOK)
			{
				return true;
			}

			this.opts = Object.assign({
				scrollDelay: 300,
				selector: ".toanimate",
				offset: 100,
				animationTime: 0
			}, opts || {});

			const run = this.exec.bind(this);
			const onScroll = () =>
			{
				clearTimeout(runTO);
				
				runTO = setTimeout(run, this.opts.scrollDelay);
			};
			var runTO;

			window.addEventListener("scroll", onScroll);

			onScroll();
			
			this.initOK = true;
		}

		static exec()
		{
			const	selector = this.opts.selector,
					offset = this.opts.offset,
					animationTime = this.opts.animationTime,
					wH = window.innerHeight,
					$$nodes = Array.from(document.querySelectorAll(selector));

			$$nodes.forEach(($node) =>
			{
				if($node.classList.contains("animate") || $node.classList.contains("animated"))
				{
					return;
				}

				let boundingRect	= $node.getBoundingClientRect(),
					yPositionTop	= boundingRect.top - wH,
					yPositionBottom	= boundingRect.bottom;

				if (yPositionTop <= offset && yPositionBottom >= -offset)
				{
					$node.classList.add("animate");

					if(animationTime > 0)
					{
						setTimeout(() =>
						{ 
							$node.classList.add("animated");
							//$node.classList.remove("animate");

						}, animationTime);
					}
                }	
			});
		}
	}

	Era.ScrollAnimation = EraScrollAnimation;
})();