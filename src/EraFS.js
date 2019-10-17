(function(window, document)
{
	"use strict";
	
	class EraFS
	{
		static formatFilesize(size, precision, decSep, thouSep)
		{
			precision	= precision || 2;
			decSep		= decSep || ',';
			thouSep		= thouSep || '.';
	
			var sizesUnits		= ['Byte', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	
			for(var i = 0; i < 9 && size >= 1024; i++)
			{
				size /= 1024;
			}
	
			return Era.N.format(size, precision, decSep, thouSep) + ' ' + sizesUnits[i];
		}

		static getFileUrl(file)
		{
			if(typeof file == 'string')
			{
				return file;
			}
	
			if(file instanceof EraBlob)
			{
				return file.getUrl();
			}
	
			if(typeof file == 'object' && window.URL)
			{
				return window.URL.createObjectURL(file);
			}
	
			return false;
		}

		static revokeFileUrl(url)
		{
			try
			{
				window.URL.revokeObjectURL(url);

				return true;
			}
			catch(e) {}

			return false;
		}

		static cropImage(options)
		{
			var image = options.image || options.url || options.file,
				success = options.success || Function.empty,
				error = options.error || Function.empty,
				width = options.width,
				height = options.height,
				resizeType = options.resizeType || options.method || 'resize',
				mimeType = options.mimeType || options.type || 'image/jpeg',
				quality = options.quality || 0.9;

			if(mimeType.indexOf('/') < 0)
			{
				mimeType = 'image/' + mimeType;
			}

			width = width || height;
			height = height || width;

			var onrender = function(imageUrl)
			{
				var $img = new Image();

				$img.onload = function()
				{
					var iWidth	= this.width,
						iHeight	= this.height,
						iRatio	= iWidth / iHeight,
						mRatio	= width / height,
						cWidth	= width,
						cHeight	= height,
						left	= 0,
						top		= 0;

					switch(resizeType)
					{
						case 'resize':

							cHeight = height;
							cWidth	= height * iRatio;

							if(cWidth > width)
							{
								cWidth = width;
								cHeight = width / iRatio;
							}

							width = cWidth;
							height = cHeight;

						break;
						case 'crop':

							if(iRatio > mRatio)
							{
								width = height * iRatio;
							}
							else
							{
								height = width / iRatio;
							}

							left	= (cWidth - width) / 2;
							top		= (cHeight - height) / 2;

						break;
					}

					var $canvas		= document.createElement('canvas');
					
					$canvas.width	= cWidth;
					$canvas.height	= cHeight;

					var ctx = $canvas.getContext('2d');

					//ctx.webkitImageSmoothingEnabled = false;
					//ctx.mozImageSmoothingEnabled = false;
					//ctx.imageSmoothingEnabled = false;

					ctx.drawImage($img, 0, 0, iWidth, iHeight, left, top, width, height);

					var blob = EraFS.getBlobFromCanvas($canvas, mimeType, quality);

					$img.onload = null;
					$img = null;

					if(blob)
					{
						return success.call(this, blob);
					}

					error.call(this, {error: 'Resize Error'});
				};

				$img.onerror = function()
				{
					error.call(this, {error: 'Load Error'});

					$img.onerror = null;
					$img = null;
				};

				$img.src = imageUrl;
			};


			var url = (typeof image == 'object') ? window.URL.createObjectURL(image) : image;

			onrender(url);
		}

		static getBlobFromCanvas($canvas, mimeType, quality)
		{
			var dataURI,
				blob;

			mimeType = (mimeType || 'image/png').toLowerCase();
			quality = quality || 0.9;

			switch(mimeType)
			{
				case "jpeg":
				case "jpg":
					mimeType = "image/jpeg";
				break;
				case "png":
					mimeType = "image/png";
				break;
			}

			if(quality > 1)
			{
				quality = quality / 100;
			}

			try
			{
				dataURI = $canvas.toDataURL(mimeType, quality);
			}
			catch(e)
			{
				mimeType = 'image/png';
				dataURI = $canvas.toDataURL('image/png', quality);
			}

			if(dataURI)
			{
				if(dataURI.match(/^data:base64,/))
				{
					// fixes android bug
					dataURI = dataURI.replace("data:", "data:image;");
				}

				try
				{
					blob = this.dataURItoBlob(dataURI);
				}
				catch(e) {}

				if(blob)
				{
					var ret = new EraBlob();

					ret.blob	= blob;
					ret.dataURI	= dataURI;

					return ret;
				}
			}

			return false;
		}

		static dataURItoBlob(dataURI)
		{
			// convert base64 to raw binary data held in a string
			// doesn't handle URLEncoded DataURIs
			var byteString;
	
	
			if (dataURI.split(',')[0].indexOf('base64') >= 0)
			{
				byteString = atob(dataURI.split(',')[1]);
			}
			else
			{
				byteString = unescape(dataURI.split(',')[1]);
			}
	
			// separate out the mime component
			var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
	
			var buf = new ArrayBuffer(byteString.length),
				arr = new Uint8Array(buf);
	
			for (var i = 0, len = byteString.length; i < len; i++)
			{
				arr[i] = byteString.charCodeAt(i);
			}
	
			var hasArrayBufferView = new Blob([new Uint8Array(100)]).size == 100;
	
			if (!hasArrayBufferView) arr = buf;
	
			var blob = new Blob([arr], { type: mimeString });
			blob.slice = blob.slice || blob.webkitSlice;
	
			return blob;
	
			// write the bytes of the string to an ArrayBuffer
			   /*var array = [];
	
			for(var i = 0; i < byteString.length; i++)
			{
				array.push(byteString.charCodeAt(i));
			}
	
		   return new Blob([new Uint8Array(array)], { "type" : mimeString })*/
		}

		static selectFile(opts = {})
		{
			return new Promise((resolve, reject) =>
			{
				$('#era-file-picker').remove();
		
				opts = opts || {};
		
				var attrs = {
					id: 'era-file-picker',
					type: 'file',
					//capture: 'camera',
					style: {
						position: 'absolute',
						top: Era.is(opts.top) ? opts.top : 0,
						left: Era.is(opts.left) ? opts.left : -99999,
						opacity: 0,
						width: 1,
						height: 1,
						pointerEvents: 'none'
					}
				};
		
				if(opts.multiple)
				{
					attrs.multiple = 'multiple';
				}
		
				var accept = opts.accept || opts.allowed || opts.type || opts.types;
		
				if(accept)
				{
					attrs.accept = accept;
				}
		
				var maxSize = opts.maxSize,
					max = opts.max || opts.limit;
		
				var rule = ['input', attrs];

				var $filePicker = N(rule, document.body);
		
				$filePicker.addEventListener('change', function(e)
				{
					var files = Array.from(this.files);
		
					if(maxSize)
					{
						files = files.filter(function(file)
						{
							return (file.size < maxSize);
						});
					}
		
					if(max && files.length > max)
					{
						files = files.slice(0, max);
					}
		
					$filePicker.parentNode.removeChild($filePicker);
		
					$filePicker = null;

					resolve(files);
				});
		
				$filePicker.focus();
				$filePicker.click();
			});
		}
	}

	class EraBlob
	{
		constructor(opts = {})
		{
			this.blob		= opts.blob;
			this.dataURI	= opts.dataURI;
			this.url		= opts.url;
		}

		getUrl()
		{
			if(!this.url && this.blob)
			{
				this.url = window.URL.createObjectURL(this.blob);
			}

			return this.url;
		}

		revokeUrl()
		{
			if(this.url)
			{
				window.URL.revokeObjectURL(this.url);
			}
		}
	}

	/*

	document.addEventListener('dragover', function(event)
	{
		event.preventDefault();
		event.stopPropagation();

		return false;

	}, false);

	document.addEventListener('drop', function(event)
	{
		event.preventDefault();
		event.stopPropagation();

		return false;

	}, false);
	*/

	class EraUploader
	{
		constructor(opts)
		{
			this.debug = !!opts.debug;

			let filters = Era.ext({
				mime_types: opts.accept || "*/*",
				max_file_size: opts.maxFileSize || "50mb",
				prevent_duplicates: true
			}, opts.filters || {});

			this.accept		= filters.mime_types;
			this.multiple	= !!opts.multiple;

			this.drop$		= $(opts.drop);

			this.plu = new plupload.Uploader({
				url: opts.url,
				browse_button: opts.button,
				drop_element: this.drop$.firstNode(),
				filters: filters,
				multipart: (opts.multipart !== false),
				multipart_params: opts.params || {},
				max_retries: opts.retries || 0,
				chunk_size: opts.chuckSize || "50mb",
				resize: opts.resize, /* {
					width,
					height
					crop: {
						width
						height
					},
					quality: 90
					preserve_headers: true
				}*/
				multi_selection: this.multiple,
				//required_features
				unique_names: !!opts.unique,
				file_data_name: opts.name || "file"
			});

			this.addEventListener(Era.Event.detectEvents(opts));

			if(this.drop$.count() > 0)
			{
				var $enterTarget;

				this.drop$.on("dragenter", (ev) =>
				{
					$enterTarget = ev.target;

					ev.stopPropagation();
					ev.preventDefault();

					this.drop$.addCls('dragenter');
				});

				this.drop$.on("dragleave", (ev) =>
				{
					ev.stopPropagation();
					ev.preventDefault();

					if($enterTarget == ev.target)
					{
						this.drop$.removeCls('dragenter');
					}
				});

				this.drop$.on("drop", (ev) =>
				{
					ev.stopPropagation();
					ev.preventDefault();

					this.drop$.removeCls('dragenter');
				});
			}

			this.plu.init();
		}

		initEventListener(name)
		{
			var eventsMap = {
				init: "Init",
				postinit: "PostInit",
				optionchanged: "OptionChanged",
				refresh: "Refresh",
				statechanged: "StateChanged",
				browse: "Browse",
				filefiltered: "FileFiltered",
				queuechanged: "QueueChanged",
				filesadded: "FilesAdded",
				filesremoved: "FilesRemoved",
				beforeupload: "BeforeUpload",
				uploadfile: "UploadFile",
				uploadprogress: "UploadProgress",
				beforechunkupload: "BeforeChunkUpload",
				chunkuploaded: "ChunkUploaded",
				fileuploaded: "FileUploaded",
				uploadcomplete: "UploadComplete",
				error: "Error",
				destroy: "Destroy"
			};

			var plname = eventsMap[name];

			if(plname)
			{
				this.plu.bind(plname, (a1, a2, a3) =>
				{	
					if(this.debug)
					{
						console.log(plname, a1, a2, a3);
					}

					this.fireEvent(name, a2, a3);
				});
			}
		}

		setOption(k, v)
		{
			return this.plu.setOption(k, v);
		}

		getOption(k)
		{
			return this.plu.getOption(k);
		}

		refresh()
		{
			return this.plu.refresh();
		}

		start()
		{
			return this.plu.start();
		}

		stop()
		{
			return this.plu.stop();
		}

		getFile(id)
		{
			return this.plu.getFile(id);
		}

		addFile(file, fileName)
		{
			return this.plu.addFile(file, fileName);
		}

		removeFile(file)
		{
			return this.plu.removeFile(file);
		}

		splice(start, len)
		{
			return this.plu.splice(start, len);
		}

		selectFile(cb)
		{
			EraFS.selectFile({
				multiple: this.multiple,
				accept: this.accept
			}).then((files) =>
			{
				this.addFile(files);
			});
		}
	}

	Era.Event.addEventHandlers(EraUploader);

	Era.FS			= EraFS;
	Era.Blob		= EraBlob;
	Era.Uploader	= EraUploader;

	Era.ready(() =>
	{
		var body$ = $('body');

		body$.on("dragenter", (e) =>
		{
			body$.addCls('dragenter');
		});

		body$.on("dragleave", (e) =>
		{
			body$.removeCls('dragenter');
		});

		body$.on("dragover", (e) =>
		{
			e.preventDefault();

			body$.removeCls('dragenter');

			return false;
		});

		body$.on("drop", (e) =>
		{
			e.preventDefault();

			body$.removeCls('dragenter');

			return false;
		});
	});

})(window, document);