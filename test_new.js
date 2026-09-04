const test = async () => {
    const file_url = "https://images.pexels.com/photos/31256342/pexels-photo-31256342.jpeg?cs=srgb&dl=pexels-optical-chemist-340351297-31256342.jpg&fm=jpg"
    const buf = await fetch(file_url)
    const arraybuffer = await buf.arrayBuffer()
    const buffer = Buffer.from(arraybuffer)
    console.log("buffer-len:", buffer.length)
};

test()