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
			className: "lazyload",
			offset: 100
		}, opts || {});

		const run = this.exec.bind(this);
		const onScroll = () =>
		{
			requestAnimationFrame(run);
		};

		window.addEventListener("scroll", onScroll);

		onScroll();
		
		this.initOK = true;
	}

	static exec()
	{
		const scrollTop = $(window).scrollTop;

		this.elements.forEach(function(elem)
		{
			let trig = elem.offset().x;

			if (scrollTop > trig) {
				//Set up animation timer the first time this
				//element is visible
				if (!elem.hasClass("animating") && !elem.hasClass("animate"))
				{
                    setTimeout(() => { 
						elem.toggleClass("animating", false)
							.toggleClass("animate", true); 
					}, self.animationTime);

					//Add animating class to track transition
					elem.toggleClass("animating", true);
                }			
            }
		});
	}
}