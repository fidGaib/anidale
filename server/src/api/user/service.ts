import { storagePath } from "@/config";
import avatar from "../dtos/avatar-random";
import tokenService from "./token-service";
import Feed from "@/db/models/feed-model";
import Token from "@/db/models/token-model";
import User from "@/db/models/user-model";
import { compare, hash } from "bcrypt";
import { createGraphQLError } from "graphql-yoga";
import { v4 } from "uuid";
import FileStorageService, { SaveImage } from "../post/file-service";
type UpdateUser = {
  avatar?: File[]
  email?: string
  isActivated?: boolean
  login?: string
  pass?: string
};

class UserService {
  async registration(email: string, pass: string) {
    const candidate = await User.findUnique({ where: { email: email.trim() } });
    if (candidate) throw createGraphQLError("E-mail занят");
    const defaultLogin = Math.round(Math.random() * 99999999);
    const avatar_random = Math.round(Math.random() * avatar.length);
    const hashPass = await hash(pass + process.env.PASS_PEPPER, 10);
    const activationLink = v4();

    const feed = await Feed.create({ data: {} });

    const user = await User.create({
      data: {
        email,
        pass: hashPass,
        activationLink,
        isActivated: false,
        login: `bot#` + defaultLogin,
        avatar: avatar[avatar_random],
        feedId: feed.id,
      },
      select: {
        pass: true,
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
  async getUser(id: number) {
    const user = await User.findUnique({
      where: { id },
      include: { feed: { include: { posts: true } }, friends: true },
    });
    if (!user) throw createGraphQLError("Пользователь не найден");
    return user;
  }
  async getUsers() {
    return await User.findMany({
      include: { feed: { include: { posts: true } }, friends: true },
    });
  }
  async update(id: number, user: UpdateUser) {
    // Find User
    const candidate = await User.findUnique({ where: { id } });
    if (!candidate) throw createGraphQLError("Пользователь не найден");
    // Update E-mail
    if (candidate.email !== user.email?.trim() && user.email?.trim()) {
      const email = await User.findUnique({
        where: { email: user.email?.trim() },
      });
      if (email) throw createGraphQLError("E-mail занят");
    }
    // Update Password
    else if (user.pass) {
      const hashPass = await hash(user.pass + process.env.PASS_PEPPER, 10);
      user.pass = hashPass;
    }
    // Update Avatar
    else if (user.avatar?.length) {
      let avatar = <SaveImage[]>[]
      const StorageService = new FileStorageService(storagePath)
      avatar = await Promise.all(user.avatar.map((image: File) => StorageService.saveImage(image)))
      const userData = await User.update({
        where: { id },
        data: {avatar: avatar[0].small},
      });
      return userData
    } 
    else if(user?.login) {
      const userData = await User.update({
        where: { id },
        data: {login: user.login}
      });
      return userData
    }
    else throw createGraphQLError("Произошла не предвиденная ошибка");
  }
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
    await Feed.deleteMany({
      where: {
        id: user.feedId,
      },
    });
    return true;
  }
  async logout(refreshToken: string) {
    return await tokenService.removeToken(refreshToken);
  }
  async refresh(refreshToken: string, accessToken: string) {
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
