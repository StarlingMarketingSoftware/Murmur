'server only';

import { auth } from "@clerk/nextjs/server";

export const getSample = async (sampleId: string) => {
  const {userId } = await auth();
  // get user

  // if not user redirect to signin

  try {
    
  }


}