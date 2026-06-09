import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { BsCheck2, BsPlus } from 'react-icons/bs'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes, shoppingPreview } from '../mockData'
import { Hero, formatPrice } from './_shared'
import './HomeShopping.scss'

const HomeShopping: FC = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (name: string) => setChecked(c => ({ ...c, [name]: !c[name] }))
  const doneCount = shoppingPreview.filter(i => checked[i.name]).length

  return (
    <>
      <Helmet><title>Prepify | Shopping List</title></Helmet>
      <div className='v2-page home-shopping'>
        <Hero heading='From recipes to one tidy shopping list.' sub='Add any recipe and Prepify combines the ingredients into a single, organized list.' />

        <section className='shopping-layout'>
          <div className='picks'>
            <h2>Add to this week’s list</h2>
            <div className='pick-grid'>
              {mockRecipes.slice(0, 6).map(r => (
                <div className='pick-card' key={r.id}>
                  <img src={r.image} alt='' />
                  <div className='pick-body'>
                    <span className='pick-title'>{r.title}</span>
                    <span className='pick-meta'>{r.servings} servings · {formatPrice(r.servingPrice)}/serv</span>
                  </div>
                  <button className='add-btn' aria-label='Add to list'><BsPlus /></button>
                </div>
              ))}
            </div>
          </div>

          <aside className='list-panel'>
            <div className='list-head'>
              <h3>Your list</h3>
              <span>{doneCount}/{shoppingPreview.length}</span>
            </div>
            <ul>
              {shoppingPreview.map(item => (
                <li key={item.name} className={checked[item.name] ? 'done' : ''}>
                  <button className='check' onClick={() => toggle(item.name)} aria-label='Toggle'>
                    {checked[item.name] && <BsCheck2 />}
                  </button>
                  <span className='name'>{item.name}</span>
                  <span className='qty'>{item.qty}</span>
                </li>
              ))}
            </ul>
            <Link to='/recipes' className='list-cta'>Send to phone →</Link>
          </aside>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeShopping
