import { isAuthenticated } from '@/lib/actions/auth.action';
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation';
import React, { ReactNode } from 'react'

const RootLayout = async ({children}:{children:ReactNode}) => {
  const isUserAuthenticated = await isAuthenticated(); 
  if(!isUserAuthenticated) return redirect('/sign-in');
  return (
      <div className='root-layout'>
    <nav className='flex items-center justify-between'>
      <div className='flex items-center gap-4'>
        <Link href="/" className='flex items-center gap-2 '>
          <Image src="/LetsCrackIt.png" alt="Logo" width = {38} height={32} />
          <h2 className='text-primary-100'>Lets Crack It</h2>
        </Link>
        <Link href="/" className='text-sm font-semibold'>Home</Link>
        <Link href="/assessment" className='text-sm font-semibold'>Assessment</Link>
        <Link href="/coding" className='text-sm font-semibold'>Coding</Link>
      </div>
      <div className='flex items-center gap-2'>
        <Link href="/assessment" className='btn'>Start Assessment</Link>
        <Link href="/coding" className='btn'>Start Coding</Link>
      </div>
    </nav>
    {children}
      </div>
  )
}

export default RootLayout
