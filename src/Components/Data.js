import React, { useState, useEffect } from 'react'
import { storage, db, getDownloadURL } from '../client/db'
import { ref, uploadBytes } from 'firebase/storage'
import { doc, collection, getDocs } from 'firebase/firestore'

const Data = () => {
  const [data, setData] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)

  const getData = async () => {
    const docRef = collection(db, 'recipes')
    const docSnaps = await getDocs(docRef)
    docSnaps.forEach(doc => {
      console.log(doc.data())
    })
  }

  useEffect(() => {
    getData()
  }, [])

  const handleFileChange = async e => {
    const file = e.target.files[0]
    const storageRef = ref(storage, 'images')
    await uploadBytes(storageRef, file)
    setFileUrl(await storageRef.getDownloadURL())
  }
  const handleSubmit = e => {
    e.preventDefault()
  }

  return <div></div>
}

export default Data
