const preloadedImages = ["arrow-up.svg", "error.svg", "success.svg"];
let imgblobs = {};

async function preload(index) {
	if (preloadedImages[index]) {
		const url = `/images/${preloadedImages[index]}`;
		const response = await fetch(url);
		response
			.blob()
			.then((blob) => {
				imgblobs[preloadedImages[index]] = URL.createObjectURL(blob);
				preload(index + 1);
			})
			.catch((error) => {
				console.error(`Failed to preload image ${preloadedImages[index]}:`, error);
				preload(index + 1);
			});
	}
}

preload(0);
