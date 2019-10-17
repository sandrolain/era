(function()
{

	class EraComponent
	{
		constructor(template = null, data = {}, $into = null)
		{
			data = data || {};

			this.el$		= null;
			this.refs		= {};
			this.data		= {};
			this.template	= template;

			this.render($into);
	
			this.setData(data);
		}

		render($into)
		{
			var el$;

			if(this.template)
			{
				el$ = $(this.template);
			}

			if(this.el$)
			{
				this.el$.appendAfter(el$);
				this.el$.remove();
			}
			else if($into)
			{
				$($into).append(el$);
			}

			this.el$ = el$;
		}

		update(data)
		{
			this.fireEvent("update", data);
		}

		setData(data)
		{
			for(let name in data)
			{
				this.applyChange(name, data[name]);
			}

			this.update(data);
		}


		applyChange(name, value)
		{
			//console.log($el, obj, name, value);

			if(!this.el$)
			{
				return false;
			}

			const $root		= this.el$.firstNode();

			_(this.el$);

			const oldValue	= this.data[name];
			const attrName	= `:${name}`;
			const selector	= `[\\${attrName}]`;

			const $$els		= Array.from($root.querySelectorAll(selector));

			if($root.matches(selector))
			{
				$$els.unshift($root);
			}

			//console.log($$els);

			for(let $actEl of $$els)
			{
				//console.log($actEl);
				let attrValue	= $actEl.getAttribute(attrName);
				let bind		= Era.CSS.parseString(attrValue);

				console.log(attrValue, bind);

				let el$			= new $($actEl);

				for(let type in bind)
				{
					let range	= bind[type],
						actVal	= value;

					if(actVal instanceof Date)
					{
						if(range)
						{
							actVal = dayjs(actVal).format(range);
						}
						else
						{
							actVal = actVal.toISOString();
						}
					}

					switch (type)
					{
						case 'child':
						case 'children':

							if (range == "text")
							{
								actVal = (actVal + "");

								actVal = document.createTextNode(actVal);
							}
							else
							{
								actVal = Era.DOM.nodeFrom(actVal);
							}
							
							el$.replace(actVal);

						break;
						// TODO: date
						case 'attr':
						case 'attribute':

							el$.setAttr(range, actVal);

						break;
						case 'cls':
						case 'class':
						case 'className':

							switch (range)
							{
								case 'toggle':
									
									el$.toggleCls(actVal);

								break;
								default:
								case 'set':

									el$.setCls(actVal);

								break;
							}

						break;
						case 'css':
						case 'style':

							if(range)
							{
								el$.css(range, actVal);
							}
							else
							{
								el$.css(actVal);
							}

						break;
						case 'value':

							el$.serValue(actVal);

						break;
						case 'on':
						case 'onl':

							//console.log(range, actVal);

							if(range)
							{
								if(!(range in events[type]))
								{
									el$[type](range, function()
									{
										events[type][range] && events[type][range].apply(this, arguments);
									});
								}

								events[type][range] = value;
							}

						break;
					}
				}
			}

			this.data[name] = value;

			return true;
		}

		static create(template, data = {}, $into = null)
		{
			return new EraComponent(template, data, $into);
		}
	}

	Era.Event.addEventHandlers(EraComponent);

	Era.Component = EraComponent;

})();