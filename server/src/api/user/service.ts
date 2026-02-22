import { storagePath } from "@/config";
import avatar from "../dtos/avatar-random";
import tokenService from "./token-service";
import Token from "@/db/models/token-model";
import User from "@/db/models/user-model";
import { compare, hash } from "bcrypt";
import { createGraphQLError } from "graphql-yoga";
import { v4 } from "uuid";
import FileStorageService, { SaveImage } from "../post/file-service";

type UpdateUser = {
  avatar?: File
  email?: string
  isActivated?: boolean
  login?: string
  pass?: string
  activationLink?: String
};

// | ----------------> UserService <---------------- |

class UserService {

// | ----------------> REGISTRATION <---------------- |

  async registration(email: string, pass: string) {
    const candidate = await User.findUnique({ where: { email: email.trim() } });
    if (candidate) throw createGraphQLError("E-mail занят");
    const defaultLogin = Math.round(Math.random() * 99999999);
    const avatar_random = Math.round(Math.random() * avatar.length);
    const hashPass = await hash(pass + process.env.PASS_PEPPER, 10);
    const activationLink = v4();

    const user = await User.create({
      data: {
        email,
        pass: hashPass,
        activationLink,
        isActivated: false,
        login: `bot#` + defaultLogin,
        avatar: avatar[avatar_random],
      },
      select: {
        id: true,
        avatar: true,
        email: true,
        login: true
      }
    });

    const tokens = await tokenService.generateTokens(user);
    await tokenService.saveToken(user.id, tokens.refreshToken);
    return {
      ...tokens,
      user,
    };
  }
// | ----------------> LOGIN <---------------- |

  async login(email: string, pass: string) {
    const candidate = await User.findUnique({
      where: { email },
      select: {
        pass: true,
        id: true,
        avatar: true,
        email: true,
        login: true
      }
    });
    if (!candidate) throw createGraphQLError("Пользователь не найден");
    const isPassEquals = await compare(
      pass + process.env.PASS_PEPPER,
      candidate.pass
    );
    if (!isPassEquals) throw createGraphQLError("Не верный пароль.");
    const tokens = await tokenService.generateTokens(candidate);
    await tokenService.saveToken(candidate.id, tokens.refreshToken);
    return {
      ...tokens,
      user: candidate,
    };
  }
  
// | ----------------> GET User <---------------- |

  async getUser(id: number) {
    const user = await User.findUnique({
      where: { id },
      include: { posts: true},
    });
    if (!user) throw createGraphQLError("Пользователь не найден");
    return user;
  }

// | ----------------> GET UserS <---------------- |
  async getUsers() {
    return await User.findMany();
  }
  
// | ----------------> UPDATE USER <---------------- |

  async updateUser(id: number, user: UpdateUser) {
    // Find User
    const candidate = await User.findUnique({ where: { id } });
    if (!candidate) throw createGraphQLError("Пользователь не найден");
    // Update avatar
    if (user.avatar) {
      let avatar = <SaveImage[]>[]
      const StorageService = new FileStorageService(storagePath)
      avatar = await Promise.all([StorageService.saveImage(user.avatar, 'avatars/')])
      // find  double image by medium
      const res = await User.findMany({
        where: {
          avatar: candidate.avatar
        }, select: {id: true}
      })
      if(res.length === 1)  await StorageService.removeAvatar(candidate.avatar)
      return await User.update({
        where: { id },
        data: {avatar: avatar[0].medium},
        select: {
          avatar: true,
        }
      });
    } 
    else if(user?.login) {
      return await User.update({
        where: { id },
        data: {login: user.login},
        select: {
          login: true,
        }
      });
    }
    else throw createGraphQLError("Произошла не предвиденная ошибка");
  }
// | ----------------> REMOVE USER <---------------- |
  async remove(id: number) {
    const user = await User.findUnique({
      where: {
        id,
      },
    });
    if (!user) throw createGraphQLError("Пользователь не найден");
    await Token.deleteMany({
      where: {
        userId: id,
      },
    });
    await User.delete({
      where: {
        id,
      },
    });
    return true;
  }

// | ----------------> LOGOUT <---------------- |

  async logout(refreshToken: string) {
    return await tokenService.removeToken(refreshToken);
  }

// | ----------------> REFRESH <---------------- |

  async refresh(refreshToken: string) {
    if(!refreshToken) throw createGraphQLError("Вы не авторизованы")
    const tokenFromDB = await Token.findMany({ where: { refreshToken } })
    const userFromDB = await User.findUnique({ where:{ id: tokenFromDB[0].userId } })
    if(!tokenFromDB || !userFromDB) throw createGraphQLError("Вы не авторизованы")
    return {
      id: userFromDB.id,
      avatar: userFromDB.avatar,
      login: userFromDB.login
    }
  }
}
export default new UserService();
