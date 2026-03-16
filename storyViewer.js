
export default class StoryViewer {

constructor(socket){
  this.socket = socket
  this.stories = []
  this.index = 0
  this.timer = null
}

open(stories, startIndex=0){
  this.stories = stories
  this.index = startIndex

  document.body.classList.add("story-open")

  this.render()
  this.startTimer()
}

render(){
  const s = this.stories[this.index]

  document.getElementById("story-slide").innerHTML = `
    <img src="${s.image}" class="story-media"/>
    <div class="story-text">${s.text||""}</div>

    <input id="storyReplyInput" placeholder="Ответить"/>
  `

  fetch(`/stories/${s.id}/view`,{method:"POST"})
}

startTimer(){
  clearTimeout(this.timer)

  this.timer = setTimeout(()=>{
    this.next()
  },5000)
}

next(){
  if(this.index < this.stories.length-1){
    this.index++
    this.render()
    this.startTimer()
  }else{
    this.close()
  }
}

prev(){
  if(this.index>0){
    this.index--
    this.render()
    this.startTimer()
  }
}

close(){
  document.body.classList.remove("story-open")
}

reply(){
  const text = document.getElementById("storyReplyInput").value
  const story = this.stories[this.index]

  this.socket.emit("message:send", {
    toUserId: story.userId,
    text,
    storyId: story.id
  })
}
}
