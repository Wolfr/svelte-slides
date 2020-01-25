<style>

    p {
        font-size: 84px;
        font-family: sans-serif;
        margin: auto;
        color: #FFF;
    }

    .overlay {
        position: fixed;
        bottom: 0;
        right: 0;
        background: rgba(255,255,255,0.1);
        padding: 2rem;
    }
    
    .overlay p {
        font-size: 14px;
    }
    
    .slide-container {
        text-align: center;
        width: 100%;
        height: 100%;
        background: #000;
        display: flex;
    }
    
    :global(body,html) {
        height: 100%;
    }
</style>

<div class="slide-container">
    <p>This is slide 1</p>
</div>

<div class="overlay">
    <p>
        Desktop only. Move forwards with the right arrow key. Move to a previous
        screen using the browser back button.
	</p>
</div>