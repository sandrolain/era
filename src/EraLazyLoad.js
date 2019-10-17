(function()
{
	class EraLazyLoad
	{
		static init(opts = {})
		{
			if(this.initOK)
			{
				return true;
			}

			this.opts = Object.assign({
				scrollDelay: 300,
				className: "lazyload",
				offset: 100
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
			const	className = this.opts.className,
					offset = this.opts.offset,
					wH = window.innerHeight;
					
			var $$images = Array.from(document.querySelectorAll(`img.${className}:not(.loading)`));
			var $img;

			$$images.forEach(function($img)
			{
				let boundingRect	= $img.getBoundingClientRect(),
					yPositionTop	= boundingRect.top - wH,
					yPositionBottom	= boundingRect.bottom;

				// if the top of the image is within 100px from the bottom of the viewport
				// and if the bottom of the image is within 100px from the top of the viewport
				// basically if the image is in the viewport, with a bit of buffer

				if (yPositionTop <= offset && yPositionBottom >= -offset)
				{
					// wait until the new image is loaded
					$img.addEventListener('load', function()
					{
						var cls = this.classList;

						cls.remove("loading");
						cls.remove(className);
					});

					$img.addEventListener('error', function()
					{
						var cls = this.classList;

						cls.remove("loading");
						cls.remove(className);

						this.setAttribute("src", actSrc);
					});

					$img.classList.add("loading");

					let actSrc	= $img.getAttribute('src');

					let src		= $img.getAttribute("data-src"),
						srcset	= $img.getAttribute("data-srcset");

					// replace the src with the data-src      
					if (src)
					{
						$img.setAttribute("src", src);
						$img.removeAttribute("data-src");
					}

					// replace the srcset with the data-srcset  
					if (srcset)
					{
						$img.setAttribute("srcset", srcset);
						$img.removeAttribute("data-srcset");
					}

					// replace the source srcset's with the data-srcset's
					let $parent = $img.parentElement;

					if ($parent.tagName === "PICTURE")
					{
						let $$sources = Array.from($parent.querySelectorAll("source")),
							$source;
						
						while ($source = $$sources.shift())
						{
							$source.setAttribute("srcset", $source.getAttribute("data-srcset"));
							$source.removeAttribute("data-srcset");
						}
					}
				}
			});
		}
	}

	Era.LazyLoad = EraLazyLoad;
})();