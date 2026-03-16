
const express = require("express")
const router = express.Router()

module.exports = (db, io, adminOnly) => {

router.get("/", (req,res)=>{
  db.all(`
    SELECT * FROM stories 
    ORDER BY createdAt DESC
  `, (err, rows)=>{
    res.json(rows)
  })
})

router.post("/", (req,res)=>{
  const { image, text } = req.body

  db.run(`
    INSERT INTO stories(userId,image,text)
    VALUES(?,?,?)
  `,[req.user.id,image,text], function(){

    const story = {
      id: this.lastID,
      userId: req.user.id,
      image,
      text
    }

    io.emit("story:new", story)

    res.json(story)
  })
})

router.post("/:id/view", (req,res)=>{
  db.run(`
    INSERT INTO story_views(storyId,viewerId)
    VALUES(?,?)
  `,[req.params.id, req.user.id])

  io.emit("story:viewed", {
    storyId: req.params.id,
    viewerId: req.user.id
  })

  res.json({ok:true})
})

router.delete("/:id", adminOnly, (req,res)=>{
  db.run(`DELETE FROM stories WHERE id=?`,[req.params.id])
  io.emit("story:deleted", {id:req.params.id})
  res.json({ok:true})
})

return router
}
