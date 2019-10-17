(function()
{
	class EraPreload
	{
		constructor(opts)
		{

		}

		getAllCssUrls()
		{
			var slen = document.styleSheets.length,
				i = 0,
				result = [];

			try
			{

			while(i < slen)
			{
				var rr = document.styleSheets[i].cssRules,
					href = document.styleSheets[i].href;

				if(rr)
				{
					var base = "",
					rlen = rr.length,
					j = 0;

					if(href)
					{
						href = href.split("/");
						href.pop();
						base = href.join("/") + "/";
					}

					while(j < rlen)
					{
						var css = rr[j].cssText;

						if(css.indexOf("url(") > -1)
						{
							var re = /url\(([^\)]+)\)/g,
								m;

							while (m = re.exec(css))
							{
								var url = m[1];

								if(url && url.match(/\.(gif|jpg|jpeg|png)/i))
								{
									url = url.replace(/("|')/g, "");

									if(url.indexOf(":/") < 0)
									{
										url = base + url;
									}

									result.push(url);
								}
							}
						}

						j++;
					}
				}

				i++;
			}
			}
			catch(e)
			{

			}

			const $$all = document.getElementsByTagName("*");

			for(let $el of $$all)
			{
				let style = window.getComputedStyle($el, false);

				let m = (style.backgroundImage || "").match(/url\(([^\)]*)\)/i);

				if(m && m[1] && m[1].match(/\.(gif|jpg|jpeg|png)/i))
				{
					result.push(m[1].replace(/(^[\s"']|[\s"']$)/g, ""));
				}
			}

			return result;
		}

		getAllMediaUrls()
		{
			const $$nodes = document.querySelectorAll("img, video, audio, source"),
				res = [];

			for(let $el of $$nodes)
			{
				if($el.src)
				{
					res.push($el.src);
				}
			}

			return res;
		}

		getAllUrls()
		{
			const cssUrls = this.getAllCssUrls(),
				mediasUrls = this.getAllMediaUrls();

			const urls = cssUrls.concat(mediasUrls).filter((elem, pos, arr) =>
			{
				return arr.indexOf(elem) == pos;
			});
			
			return urls;
		}

		preload(opts = {})
		{
			const urls	= this.getAllUrls();
			const proms	= [];
			const total	= urls.length;
			var progress	= 0;

			for(let url of urls)
			{
				let p = new Promise((resolve, reject) =>
				{
					const next = () =>
					{
						progress++;

						const prog = progress / total;

						if(opts.progress)
						{
							opts.progress(prog);
						}

						resolve(prog);
					};

					fetch(url).then(next, next);
				});

				proms.push(p);
			}

			return Promise.all(proms).then(() =>
			{
				if(opts.progress)
				{
					opts.progress(1);
				}

				if(opts.complete)
				{
					opts.complete();
				}
			});
		}
	}

	Era.Preload = EraPreload;
})();